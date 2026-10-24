const FONT_URL = new URL('./assets/NotoSansSC-Regular.ttf', import.meta.url);
const COMMON_FONT_URL = new URL('./assets/NotoSansSC-Common.ttf', import.meta.url);
const COMMON_FONT_GZIP_URL = new URL('./assets/NotoSansSC-Common.ttf.gz', import.meta.url);
let fontBytesPromise;
let commonFontPromise;

const money = (value) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value));
const number = (value) => new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 4,
}).format(Number(value));
const shipNames = {
  container: '集装箱船 / 滚装船 / 客船',
  tanker: '油船 / 化学品船 / 液化气体船',
  bulk: '散货船 / 杂货船 / 其他',
};
const loadNames = { laden: '重载', half: '半载', ballast: '空载' };

async function fetchFontBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('中文 PDF 字体加载失败，请刷新页面后重试。');
  return new Uint8Array(await response.arrayBuffer());
}

async function loadFullFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = fetchFontBytes(FONT_URL).catch((error) => {
      fontBytesPromise = undefined;
      throw error;
    });
  }
  return fontBytesPromise;
}

async function loadCommonFont() {
  let bytes;
  if (typeof globalThis.DecompressionStream === 'function') {
    try {
      const compressed = await fetchFontBytes(COMMON_FONT_GZIP_URL);
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      bytes = await fetchFontBytes(COMMON_FONT_URL);
    }
  } else {
    bytes = await fetchFontBytes(COMMON_FONT_URL);
  }
  return { bytes, characters: new Set(globalThis.fontkit.create(bytes).characterSet) };
}

async function loadFontBytes(state, result) {
  if (!commonFontPromise) {
    commonFontPromise = loadCommonFont().catch((error) => {
      commonFontPromise = undefined;
      throw error;
    });
  }
  let common;
  try {
    common = await commonFontPromise;
  } catch {
    return loadFullFontBytes();
  }
  for (const char of JSON.stringify({ state, result })) {
    if (!common.characters.has(char.codePointAt(0))) return loadFullFontBytes();
  }
  return common.bytes;
}

export async function buildQuotePdf(state, result) {
  const { PDFDocument, StandardFonts, rgb } = globalThis.PDFLib || {};
  if (!PDFDocument || !globalThis.fontkit) {
    throw new Error('PDF 组件尚未就绪，请刷新页面后重试。');
  }
  const exchangeRate = Number(state.exchangeRate);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('汇率必须为大于 0 的有效数字。');
  }
  const doc = await PDFDocument.create();
  doc.registerFontkit(globalThis.fontkit);
  const [font, latin, latinBold] = await Promise.all([
    // 此中文字体经 fontkit 子集化会漏字；完整嵌入确保 PDF 实际可见。
    doc.embedFont(await loadFontBytes(state, result), { subset: false }),
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  doc.setTitle(`船舶港口费用报价单 - ${state.vesselName || '未命名船舶'}`);
  doc.setSubject('Port Disbursement Estimate / CNY / USD');
  doc.setCreator('舟山船舶自动报价系统');
  doc.setProducer('舟山船舶自动报价系统 / pdf-lib');

  const W = 595.28;
  const H = 841.89;
  const M = 43;
  const CW = W - M * 2;
  const bottom = 57;
  const colors = {
    navy: rgb(0.055, 0.15, 0.20), teal: rgb(0.0, 0.47, 0.43),
    text: rgb(0.13, 0.20, 0.23), muted: rgb(0.40, 0.47, 0.49),
    line: rgb(0.85, 0.89, 0.89), pale: rgb(0.94, 0.97, 0.96),
    white: rgb(1, 1, 1), amber: rgb(0.51, 0.33, 0.10),
  };
  const supported = new Set(font.getCharacterSet());
  const safe = (value) => Array.from(String(value ?? '').replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''))
    .map((char) => char === '\n' || supported.has(char.codePointAt(0)) ? char : '□').join('');
  let page;
  let y;
  function draw(text, x, baseline, size = 9, color = colors.text, selectedFont = font) {
    page.drawText(selectedFont === font ? safe(text) : String(text), {
      x, y: baseline, size, font: selectedFont, color,
    });
  }
  function newPage(first = false) {
    page = doc.addPage([W, H]);
    if (first) {
      page.drawRectangle({ x: 0, y: H - 112, width: W, height: 112, color: colors.navy });
      page.drawRectangle({ x: M, y: H - 31, width: 28, height: 3, color: colors.teal });
      draw('船舶港口费用报价单', M, H - 63, 21, colors.white);
      draw('PORT DISBURSEMENT ESTIMATE', M, H - 84, 8.5, colors.white, latin);
      draw('舟山港', W - M - 48, H - 49, 12, colors.white);
      draw('CNY', W - M - 24, H - 77, 10, colors.white, latinBold);
      y = H - 137;
    } else {
      draw('船舶港口费用报价单 / 续页', M, H - 37, 10, colors.navy);
      page.drawLine({ start: { x: M, y: H - 48 }, end: { x: W - M, y: H - 48 }, color: colors.line, thickness: 0.7 });
      y = H - 68;
    }
  }
  function ensure(height) {
    if (y - height < bottom) newPage();
  }
  function wrap(value, width, size = 9, selectedFont = font) {
    const text = selectedFont === font ? safe(value) : String(value ?? '');
    const lines = [];
    let line = '';
    let lineWidth = 0;
    for (const char of text) {
      if (char === '\n') {
        lines.push(line);
        line = '';
        lineWidth = 0;
        continue;
      }
      const charWidth = selectedFont.widthOfTextAtSize(char, size);
      if (line && lineWidth + charWidth > width) {
        lines.push(line.trimEnd());
        line = '';
        lineWidth = 0;
      }
      if (!line && char === ' ') continue;
      line += char;
      lineWidth += charWidth;
    }
    lines.push(line);
    return lines;
  }
  function paragraph(value, { size = 8.5, color = colors.muted, indent = 0, gap = 5 } = {}) {
    for (const line of wrap(value, CW - indent, size)) {
      ensure(size + 6);
      draw(line, M + indent, y, size, color);
      y -= size + 5;
    }
    y -= gap;
  }
  function section(label) {
    ensure(39);
    y -= 9;
    page.drawRectangle({ x: M, y: y - 1, width: 3, height: 11, color: colors.teal });
    draw(label, M + 12, y, 10.5, colors.navy);
    y -= 23;
  }
  function field(label, value) {
    const lines = wrap(value || '未填写', CW - 73, 9);
    for (let index = 0; index < lines.length; index += 1) {
      ensure(17);
      if (index === 0) draw(label, M, y, 8, colors.muted);
      draw(lines[index], M + 73, y, 9);
      y -= 15;
    }
    y -= 3;
  }
  function fee(label, english, amount, description) {
    const lines = wrap(description, CW, 8);
    ensure(31 + Math.min(lines.length, 4) * 12);
    draw(label, M, y, 10.5, colors.navy);
    draw(english, M + 96, y + 1, 7.5, colors.muted, latin);
    const amountText = money(amount);
    let amountSize = 13;
    while (latinBold.widthOfTextAtSize(amountText, amountSize) > 200) amountSize -= 0.5;
    draw(amountText, W - M - latinBold.widthOfTextAtSize(amountText, amountSize), y, amountSize, colors.navy, latinBold);
    y -= 19;
    for (const line of lines) {
      ensure(14);
      draw(line, M, y, 8, colors.muted);
      y -= 12;
    }
    y -= 4;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: colors.line });
    y -= 18;
  }

  newPage(true);
  field('船舶名称', state.vesselName);
  field('国籍', state.nationality);
  field('净吨', `${number(state.nt)} NT`);
  field('船舶长度', `${number(state.length)} 米`);
  field('汇率', `1 USD = ${exchangeRate} CNY（用户输入）`);
  field('码头或船厂', state.portName);
  field('报价编号', state.quotationNo);
  field('报价日期', state.quoteDate);
  field('客户名称', state.client);

  section('船舶及作业信息');
  field('贸易 / 船型', `${state.trade === 'domestic' ? '内贸 / 国内航线' : '外贸 / 国际航线'}；${shipNames[state.shipType] || state.shipType}`);
  field('靠泊 / 区域', `${number(state.berthDays)} 天；${state.area || '区域未填写'}${state.routeName ? `；${state.routeName}` : ''}`);
  field('载况 / 拖轮', `靠泊${loadNames[state.inLoad] || state.inLoad} ${state.tugInCount}艘 × ${state.tugInOps}次；离泊${loadNames[state.outLoad] || state.outLoad} ${state.tugOutCount}艘 × ${state.tugOutOps}次`);

  section('费用明细');
  const pilotDescription = `${result.pilot.description} 进港 ${money(result.pilot.inAmount)} 元；出港 ${money(result.pilot.outAmount)} 元。`;
  fee('引航费', 'PILOTAGE', result.pilot.amount, pilotDescription);
  fee('拖轮费', 'TUG ASSISTANCE', result.tug.amount, result.tug.description);
  fee('船舶吨税', 'TONNAGE DUES', result.tax.amount, result.tax.description);
  fee('码头靠泊费', 'BERTH CHARGES', result.berth.amount, result.berth.description);

  ensure(82);
  page.drawRectangle({ x: M, y: y - 64, width: CW, height: 76, color: colors.pale });
  draw('费用合计', M + 15, y - 10, 11, colors.navy);
  draw('TOTAL ESTIMATE', M + 15, y - 28, 7.5, colors.muted, latin);
  draw('按用户输入汇率折算', M + 15, y - 47, 7.5, colors.muted);
  const totalText = money(result.total);
  let totalSize = 22;
  while (latinBold.widthOfTextAtSize(totalText, totalSize) > 290) totalSize -= 0.5;
  const totalX = W - M - 15 - latinBold.widthOfTextAtSize(totalText, totalSize);
  draw('CNY', totalX - 28, y - 17, 7.5, colors.teal, latin);
  draw(totalText, totalX, y - 21, totalSize, colors.teal, latinBold);
  const usdText = `USD ${money(result.total / exchangeRate)}`;
  draw(usdText, W - M - 15 - latin.widthOfTextAtSize(usdText, 12), y - 46, 12, colors.navy, latin);
  y -= 84;

  newPage();
  section('计费口径');
  if (state.inBoarding || state.outBoarding) {
    paragraph(`引航路线：进港 ${state.inBoarding || '未填写'}，${number(state.inDistance)} 海里 × ${state.pilotInCount} 次；出港 ${state.outBoarding || '未填写'}，${number(state.outDistance)} 海里 × ${state.pilotOutCount} 次。`);
  }
  for (const segment of result.pilot.segments || []) {
    paragraph(`${segment.label}：${number(segment.tonnage)} 净吨 × ${number(segment.baseRate)} 元/净吨。`, { size: 8, gap: 2 });
  }
  if (result.pilot.baseFee !== undefined) {
    paragraph(`单次引航基本费 ${money(result.pilot.baseFee)} 元；非基本港附加 ${money(result.pilot.portSurcharge)} 元；进港超程 ${money(result.pilot.inDistanceFee)} 元，出港超程 ${money(result.pilot.outDistanceFee)} 元。`, { size: 8, gap: 2 });
  }
  if (state.taxEnabled) {
    paragraph(`吨税选项：${state.taxDays} 日${state.taxRegime === 'ordinary' ? '普通' : '优惠'}税率；船型系数 ${number(state.taxFactor)}。`, { size: 8, gap: 2 });
  }
  paragraph('拖轮艘数采用报价录入值，可人工调整；实际配置以作业安排为准。', { size: 8, gap: 2 });
  for (const warning of result.warnings || []) {
    paragraph(`核对事项：${warning}`, { size: 8, color: colors.amber, gap: 2 });
  }
  if (String(state.notes || '').trim()) {
    section('报价备注');
    paragraph(state.notes, { size: 8.5, color: colors.text });
  }
  section('费率依据');
  paragraph('引航：zspilot.com.cn/news_viewn.asp?newsid=603（2023费率）；吨税：zsagent01.com/dues/。', { size: 7.5, gap: 2 });
  if (state.pilotInNight || state.pilotOutNight || state.pilotInHoliday || state.pilotOutHoliday) {
    paragraph('引航夜班及节假日附加：zspilot.com.cn/news_viewn.asp?newsid=2362。', { size: 7.5, gap: 2 });
  }
  paragraph('拖轮：用户提供《拖轮收费.doc》，费率档位端点暂按上限包含；80米以下配置原件有歧义。靠泊：0.25 × 净吨 × 天数（用户规则）。', { size: 7.5, gap: 2 });
  paragraph('本报价为费用预估，最终以实际作业及结算为准。', { size: 7.5, gap: 0 });

  const pages = doc.getPages();
  pages.forEach((current, index) => {
    page = current;
    page.drawLine({ start: { x: M, y: 41 }, end: { x: W - M, y: 41 }, color: colors.line, thickness: 0.6 });
    draw('ZHOUSHAN / PORT DISBURSEMENT ESTIMATE', M, 27, 6.5, colors.muted, latin);
    const pageText = `第 ${index + 1} / ${pages.length} 页`;
    draw(pageText, W - M - font.widthOfTextAtSize(pageText, 7), 27, 7, colors.muted);
  });
  return doc.save();
}

export async function downloadQuotePdf(state, result) {
  const bytes = await buildQuotePdf(state, result);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const vesselName = String(state.vesselName || '未命名船舶').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 80);
  anchor.href = url;
  anchor.download = `${vesselName}_港口费用报价_${String(state.quoteDate || '').replace(/[^0-9-]/g, '')}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return bytes;
}

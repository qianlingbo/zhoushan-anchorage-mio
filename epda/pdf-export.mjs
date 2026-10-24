const FONT_URL = new URL('./assets/NotoSansSC-Regular.ttf', import.meta.url);
const COMMON_FONT_URL = new URL('./assets/NotoSansSC-Common.ttf', import.meta.url);
const COMMON_FONT_GZIP_URL = new URL('./assets/NotoSansSC-Common.ttf.gz', import.meta.url);
let fontBytesPromise;
let commonFontPromise;

const money = (value) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value));
const number = (value) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
}).format(Number(value));

const COPY = {
  zh: {
    title: '船舶港口费用报价单',
    continuation: '船舶港口费用报价单（续页）',
    vessel: '船名',
    nationality: '国籍',
    netTonnage: '净吨',
    length: '船舶长度',
    exchangeRate: '汇率',
    terminal: '码头或船厂',
    quoteNo: '报价编号',
    date: '报价日期',
    client: '客户',
    trade: '贸易类型',
    berthDays: '靠泊天数',
    foreign: '外贸',
    domestic: '内贸',
    feeNo: '序号',
    feeName: '费用项目',
    amount: '金额 (CNY)',
    pilot: '引航费',
    tug: '拖轮费',
    tax: '船舶吨税',
    berth: '码头靠泊费',
    total: '费用合计 (CNY)',
    usd: '折合美元 (USD)',
    notes: '备注',
    page: '第',
    pageOf: '页 / 共',
    pageEnd: '页',
    untitled: '未命名船舶',
  },
  en: {
    title: 'PORT DISBURSEMENT ESTIMATE',
    continuation: 'PORT DISBURSEMENT ESTIMATE (CONTINUED)',
    vessel: 'Vessel',
    nationality: 'Flag',
    netTonnage: 'Net tonnage',
    length: 'Vessel length',
    exchangeRate: 'Exchange rate',
    terminal: 'Terminal / shipyard',
    quoteNo: 'Quotation No.',
    date: 'Date',
    client: 'Client',
    trade: 'Trade',
    berthDays: 'Berth days',
    foreign: 'International',
    domestic: 'Domestic',
    feeNo: 'No.',
    feeName: 'Charge item',
    amount: 'Amount (CNY)',
    pilot: 'Pilotage',
    tug: 'Tug assistance',
    tax: 'Tonnage dues',
    berth: 'Berth charges',
    total: 'TOTAL (CNY)',
    usd: 'Equivalent (USD)',
    notes: 'Notes',
    page: 'Page',
    pageOf: 'of',
    pageEnd: '',
    untitled: 'Unnamed vessel',
  },
};

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

async function loadFontBytes(visibleText) {
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
  for (const char of visibleText) {
    if (!common.characters.has(char.codePointAt(0))) return loadFullFontBytes();
  }
  return common.bytes;
}

function clean(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '  ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export async function buildQuotePdf(state, result, language = 'zh') {
  const { PDFDocument, StandardFonts, rgb } = globalThis.PDFLib || {};
  if (!PDFDocument || !globalThis.fontkit) {
    throw new Error('PDF 组件尚未就绪，请刷新页面后重试。');
  }
  const exchangeRate = Number(state.exchangeRate);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('汇率必须为大于 0 的有效数字。');
  }
  const lang = language === 'en' ? 'en' : 'zh';
  const copy = COPY[lang];
  const fields = [
    [copy.vessel, state.vesselName || '—'],
    [copy.nationality, state.nationality || '—'],
    [copy.netTonnage, number(state.nt) + ' NT'],
    [copy.length, number(state.length) + ' m'],
    [copy.exchangeRate, '1 USD = ' + number(exchangeRate) + ' CNY'],
    [copy.terminal, state.portName || '—'],
    [copy.quoteNo, state.quotationNo || '—'],
    [copy.date, state.quoteDate || '—'],
    [copy.trade, state.trade === 'domestic' ? copy.domestic : copy.foreign],
    [copy.berthDays, number(state.berthDays) + (lang === 'zh' ? ' 天' : ' days')],
  ];
  if (String(state.client || '').trim()) fields.push([copy.client, state.client]);
  const fees = [
    { name: copy.pilot, amount: result.pilot.amount },
    { name: copy.tug, amount: result.tug.amount },
    { name: copy.tax, amount: result.tax.amount },
    { name: copy.berth, amount: result.berth.amount },
    ...(result.extraFees || []).map((fee) => ({
      name: lang === 'en' ? fee.nameEn || fee.nameZh : fee.nameZh || fee.nameEn,
      amount: fee.amount,
    })),
  ];
  const notes = clean(state.notes).trim();
  const visibleText = [
    ...Object.values(copy),
    ...fields.flat(),
    ...fees.map((fee) => fee.name),
    notes,
  ].join('');

  const doc = await PDFDocument.create();
  doc.registerFontkit(globalThis.fontkit);
  const [cjk, latin, latinBold] = await Promise.all([
    // The source font loses glyphs with pdf-lib subsetting, so embed its compact complete font.
    doc.embedFont(await loadFontBytes(visibleText), { subset: false }),
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  doc.setTitle(copy.title + ' - ' + (state.vesselName || copy.untitled));
  doc.setSubject('Port Disbursement Estimate / CNY / USD');
  doc.setCreator('舟山船舶自动报价系统');
  doc.setProducer('舟山船舶自动报价系统 / pdf-lib');

  const W = 595.28;
  const H = 841.89;
  const M = 40;
  const CW = W - 2 * M;
  const BOTTOM = 55;
  const palette = {
    ink: rgb(0.11, 0.20, 0.23),
    dark: rgb(0.05, 0.18, 0.21),
    teal: rgb(0.00, 0.45, 0.42),
    muted: rgb(0.35, 0.42, 0.44),
    grid: rgb(0.73, 0.79, 0.80),
    stripe: rgb(0.965, 0.978, 0.975),
    total: rgb(0.89, 0.95, 0.93),
    white: rgb(1, 1, 1),
  };
  const supported = new Set(cjk.getCharacterSet());
  let page;
  let y;

  function textFont(value) {
    return /^[\x20-\x7E\n]*$/.test(clean(value)) ? latin : cjk;
  }
  function safe(value, selectedFont) {
    const cleaned = clean(value);
    if (selectedFont !== cjk) return cleaned;
    return Array.from(cleaned).map((char) => (
      char === '\n' || supported.has(char.codePointAt(0)) ? char : '□'
    )).join('');
  }
  function draw(value, x, baseline, size = 9, color = palette.ink, selectedFont = textFont(value)) {
    const content = safe(value, selectedFont);
    if (content) page.drawText(content, { x, y: baseline, size, font: selectedFont, color });
  }
  function wrap(value, width, size = 9, selectedFont = textFont(value)) {
    const lines = [];
    let line = '';
    let lineWidth = 0;
    for (const char of safe(value, selectedFont)) {
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
  function rule(x1, y1, x2, y2, thickness = 0.5, color = palette.grid) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  }
  function cell(x, top, width, height, fill = palette.white) {
    page.drawRectangle({
      x, y: top - height, width, height,
      color: fill, borderColor: palette.grid, borderWidth: 0.5,
    });
  }
  function newPage(first = false) {
    page = doc.addPage([W, H]);
    const title = first ? copy.title : copy.continuation;
    const titleFont = lang === 'zh' ? cjk : latinBold;
    draw(title, M, H - 44, first ? 16 : 11, palette.dark, titleFont);
    rule(M, H - 59, W - M, H - 59, 1.2, palette.teal);
    y = H - 76;
  }
  function ensure(height) {
    if (y - height < BOTTOM) newPage();
  }
  function fieldRow(label, value, stripe = false) {
    const LABEL_W = 137;
    const labelFont = textFont(label);
    const valueFont = textFont(value);
    const labelLines = wrap(label, LABEL_W - 14, 8.6, labelFont);
    const valueLines = wrap(value, CW - LABEL_W - 16, 9.2, valueFont);
    const height = Math.max(27, Math.max(labelLines.length, valueLines.length) * 12 + 11);
    ensure(height);
    cell(M, y, CW, height, stripe ? palette.stripe : palette.white);
    rule(M + LABEL_W, y, M + LABEL_W, y - height);
    labelLines.forEach((line, index) => draw(line, M + 8, y - 17 - index * 12, 8.6, palette.muted, labelFont));
    valueLines.forEach((line, index) => draw(line, M + LABEL_W + 8, y - 17 - index * 12, 9.2, palette.ink, valueFont));
    y -= height;
  }
  function feeHeader() {
    const height = 29;
    ensure(height);
    cell(M, y, CW, height, palette.dark);
    const amountX = W - M - 145;
    rule(M + 43, y, M + 43, y - height, 0.5, palette.grid);
    rule(amountX, y, amountX, y - height, 0.5, palette.grid);
    draw(copy.feeNo, M + 11, y - 18, 8.5, palette.white, textFont(copy.feeNo));
    draw(copy.feeName, M + 52, y - 18, 8.5, palette.white, textFont(copy.feeName));
    draw(copy.amount, amountX + 10, y - 18, 8.5, palette.white, textFont(copy.amount));
    y -= height;
  }
  function ensureFee(height) {
    if (y - height < BOTTOM) {
      newPage();
      feeHeader();
    }
  }
  function feeRow(index, fee) {
    const amountX = W - M - 145;
    const name = fee.name || (lang === 'zh' ? '其他费用' : 'Other charge');
    const nameFont = textFont(name);
    const nameLines = wrap(name, amountX - M - 43 - 17, 9.2, nameFont);
    const height = Math.max(29, nameLines.length * 12 + 11);
    ensureFee(height);
    cell(M, y, CW, height, index % 2 ? palette.stripe : palette.white);
    rule(M + 43, y, M + 43, y - height);
    rule(amountX, y, amountX, y - height);
    draw(String(index + 1), M + 14, y - 18, 9, palette.muted, latin);
    nameLines.forEach((line, lineIndex) => {
      draw(line, M + 52, y - 18 - lineIndex * 12, 9.2, palette.ink, nameFont);
    });
    const amount = money(fee.amount);
    draw(amount, W - M - 10 - latinBold.widthOfTextAtSize(amount, 9.5), y - 18, 9.5, palette.ink, latinBold);
    y -= height;
  }
  function totalRow(label, amount, primary = false) {
    const height = primary ? 34 : 31;
    ensureFee(height);
    const amountX = W - M - 145;
    cell(M, y, CW, height, primary ? palette.total : palette.white);
    rule(amountX, y, amountX, y - height);
    draw(label, M + 11, y - 21, primary ? 10 : 9, primary ? palette.dark : palette.muted, textFont(label));
    const value = money(amount);
    const size = primary ? 12 : 10;
    draw(value, W - M - 10 - latinBold.widthOfTextAtSize(value, size), y - 21, size,
      primary ? palette.teal : palette.ink, latinBold);
    y -= height;
  }
  function noteRows() {
    if (!notes) return;
    const lines = wrap(notes, CW - 18, 9);
    ensure(27);
    cell(M, y, CW, 27, palette.stripe);
    draw(copy.notes, M + 9, y - 18, 9, palette.dark, textFont(copy.notes));
    y -= 27;
    for (const line of lines) {
      ensure(20);
      cell(M, y, CW, 20);
      draw(line, M + 9, y - 14, 9);
      y -= 20;
    }
  }

  newPage(true);
  fields.forEach(([label, value], index) => fieldRow(label, value, index % 2 === 1));
  y -= 16;
  feeHeader();
  fees.forEach((fee, index) => feeRow(index, fee));
  totalRow(copy.total, result.total, true);
  totalRow(copy.usd, Number(result.total) / exchangeRate);
  y -= 13;
  noteRows();

  const pages = doc.getPages();
  pages.forEach((current, index) => {
    page = current;
    rule(M, 40, W - M, 40, 0.6, palette.grid);
    const pageLabel = lang === 'zh'
      ? copy.page + (index + 1) + copy.pageOf + pages.length + copy.pageEnd
      : copy.page + ' ' + (index + 1) + ' ' + copy.pageOf + ' ' + pages.length;
    draw(pageLabel, W - M - textFont(pageLabel).widthOfTextAtSize(pageLabel, 8), 25, 8, palette.muted);
  });
  return doc.save();
}

export async function downloadQuotePdf(state, result, language = 'zh') {
  const lang = language === 'en' ? 'en' : 'zh';
  const bytes = await buildQuotePdf(state, result, lang);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const vesselName = String(state.vesselName || COPY[lang].untitled)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 80);
  const suffix = lang === 'zh' ? '港口费用报价_中文' : 'Port_Quotation_English';
  anchor.href = url;
  anchor.download = vesselName + '_' + suffix + '_' + String(state.quoteDate || '').replace(/[^0-9-]/g, '') + '.pdf';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return bytes;
}

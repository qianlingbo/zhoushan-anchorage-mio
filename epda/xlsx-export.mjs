const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const COPY = {
  zh: {
    sheet: '报价', title: '船舶港口费用报价单', vessel: '船名', nationality: '国籍',
    nt: '净吨 (NT)', length: '船长 (m)', exchange: '汇率 (CNY/USD)', terminal: '码头或船厂',
    number: '报价编号', date: '报价日期', validUntil: '报价有效期', trade: '贸易类型', berthDays: '靠泊天数',
    foreign: '外贸', domestic: '内贸', client: '客户 / 委托方',
    inPoint: '进港引水登轮点', outPoint: '出港引水离轮点',
    itemNo: '序号', item: '费用项目', amount: '金额 (CNY)',
    pilot: '引航费', pilotOvertime: '出港引航加班费', tug: '拖轮费', tax: '船舶吨税', berth: '码头靠泊费',
    total: '费用合计 (CNY)', usd: '折合美元 (USD)', notes: '备注',
    cnyBank: '人民币汇款信息 (CNY)', usdBank: '美元汇款信息 (USD)',
    bank: '收款银行', account: '收款账号', code: 'SWIFT / 交换码', untitled: '未命名船舶',
  },
  en: {
    sheet: 'Quotation', title: 'PORT DISBURSEMENT ESTIMATE', vessel: 'Vessel', nationality: 'Flag',
    nt: 'Net tonnage (NT)', length: 'Length (m)', exchange: 'Exchange (CNY/USD)', terminal: 'Terminal / yard',
    number: 'Quotation no.', date: 'Date', validUntil: 'Valid until', trade: 'Trade', berthDays: 'Berth days',
    foreign: 'Foreign', domestic: 'Domestic', client: 'Client',
    inPoint: 'Arrival pilot point', outPoint: 'Departure pilot point',
    itemNo: 'No.', item: 'Charge', amount: 'Amount (CNY)',
    pilot: 'Pilotage', pilotOvertime: 'Departure pilotage overtime', tug: 'Towage', tax: 'Tonnage dues', berth: 'Berthage',
    total: 'Total (CNY)', usd: 'Equivalent (USD)', notes: 'Notes',
    cnyBank: 'CNY remittance details', usdBank: 'USD remittance details',
    bank: 'Bank', account: 'Account no.', code: 'SWIFT / clearing code', untitled: 'Unnamed vessel',
  },
};

function xml(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function finite(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}不是有效数字`);
  return parsed;
}

function displayUnits(value) {
  return Array.from(String(value ?? '')).reduce((count, char) => count + (char.codePointAt(0) > 127 ? 2 : 1), 0);
}

function cell(ref, value, style = 4) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function numeric(ref, value, style = 5) {
  return `<c r="${ref}" s="${style}" t="n"><v>${finite(value, ref)}</v></c>`;
}

function formula(ref, expression, value, style = 7) {
  return `<c r="${ref}" s="${style}"><f>${expression}</f><v>${finite(value, ref)}</v></c>`;
}

function dateSerial(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
    ? time / 86400000 + 25569 : null;
}

function stylesXml() {
  const xf = (font, fill, numFmt = 0, align = 'left') =>
    `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="${align}" vertical="center" wrapText="1"/></xf>`;
  const xfs = [
    xf(0, 0),     // 0 ordinary
    xf(1, 2),     // 1 title
    xf(2, 3),     // 2 section
    xf(3, 4),     // 3 field label
    xf(0, 0),     // 4 text
    xf(0, 0, 164, 'right'), // 5 CNY / USD
    xf(3, 5),     // 6 total label
    xf(4, 5, 164, 'right'), // 7 total amount
    xf(2, 2),     // 8 fee header
    xf(0, 6),     // 9 stripe text
    xf(0, 6, 164, 'right'), // 10 stripe amount
    xf(0, 0, 165), // 11 date
    xf(0, 0, 0, 'right'), // 12 other numeric input
    xf(0, 0, 49), // 13 bank account text, preserving leading zeros on later edits
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<styleSheet xmlns="${NS}">` +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts>' +
    '<fonts count="5">' +
    '<font><sz val="10"/><name val="Arial"/><color rgb="FF203640"/></font>' +
    '<font><b/><sz val="15"/><name val="Arial"/><color rgb="FFFFFFFF"/></font>' +
    '<font><b/><sz val="10"/><name val="Arial"/><color rgb="FFFFFFFF"/></font>' +
    '<font><b/><sz val="10"/><name val="Arial"/><color rgb="FF203640"/></font>' +
    '<font><b/><sz val="11"/><name val="Arial"/><color rgb="FF17634F"/></font>' +
    '</fonts>' +
    '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    ['142D38', '277562', 'EFF3F1', 'E4F2ED', 'F7FAF8'].map((color) =>
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`).join('') +
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="hair"><color rgb="FFDCE5E1"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

export async function buildQuoteXlsx(state, result, language = 'zh') {
  if (!globalThis.JSZip) throw new Error('Excel 组件未加载，请刷新页面后重试');
  const lang = language === 'en' ? 'en' : 'zh';
  const copy = COPY[lang];
  const rate = finite(state.exchangeRate, copy.exchange);
  if (rate <= 0) throw new Error('汇率必须大于零');
  const total = finite(result.total, copy.total);
  const rows = [];
  const merges = [];
  let rowNo = 0;
  const add = (makeCells, height = 24) => {
    rowNo += 1;
    rows.push(`<row r="${rowNo}" ht="${height}" customHeight="1">${makeCells(rowNo)}</row>`);
    return rowNo;
  };
  const pair = (aLabel, aValue, bLabel, bValue, aType = 'text', bType = 'text') => {
    const lines = Math.max(Math.ceil(displayUnits(aValue) / 25), Math.ceil(displayUnits(bValue) / 30), 1);
    const height = Math.max(29, Math.min(120, lines * 15 + 12));
    return add((r) =>
      cell(`A${r}`, aLabel, 3) + (aType === 'number' ? numeric(`B${r}`, aValue, 12) : aType === 'date' && dateSerial(aValue) !== null ? numeric(`B${r}`, dateSerial(aValue), 11) : cell(`B${r}`, aValue)) +
      cell(`C${r}`, bLabel, 3) + (bType === 'number' ? numeric(`D${r}`, bValue, 12) : bType === 'date' && dateSerial(bValue) !== null ? numeric(`D${r}`, dateSerial(bValue), 11) : cell(`D${r}`, bValue)), height);
  };
  const full = (label, value, height = 29, valueStyle = 4) => {
    const lines = Math.max(Math.ceil(displayUnits(value) / 70), 1);
    const actualHeight = Math.max(height, Math.min(160, lines * 17 + 8));
    const r = add((n) => cell(`A${n}`, label, 3) + cell(`B${n}`, value, valueStyle) + cell(`C${n}`, '', valueStyle) + cell(`D${n}`, '', valueStyle), actualHeight);
    merges.push(`B${r}:D${r}`);
    return r;
  };
  const section = (title) => {
    const r = add((n) => ['A', 'B', 'C', 'D'].map((col, i) => cell(`${col}${n}`, i ? '' : title, 2)).join(''), 25);
    merges.push(`A${r}:D${r}`);
    return r;
  };

  const titleRow = add((r) => ['A', 'B', 'C', 'D'].map((col, i) => cell(`${col}${r}`, i ? '' : copy.title, 1)).join(''), 36);
  merges.push(`A${titleRow}:D${titleRow}`);
  add(() => '', 8);
  pair(copy.vessel, state.vesselName || '—', copy.nationality, state.nationality || '—');
  pair(copy.nt, state.nt, copy.length, state.length, 'number', 'number');
  pair(copy.exchange, rate, copy.terminal, state.portName || '—', 'number');
  pair(copy.number, state.quotationNo || '—', copy.date, state.quoteDate || '—', 'text', 'date');
  const validUntil = String(state.validUntil || '').trim();
  if (validUntil) {
    const validSerial = dateSerial(validUntil);
    if (validSerial === null || (dateSerial(state.quoteDate) !== null && validSerial < dateSerial(state.quoteDate))) {
      throw new Error('报价有效期必须是报价日期当天或之后的有效日期');
    }
    add((r) => cell(`A${r}`, copy.validUntil, 3) + numeric(`B${r}`, validSerial, 11) + cell(`C${r}`, '') + cell(`D${r}`, ''), 29);
  }
  pair(copy.trade, state.trade === 'domestic' ? copy.domestic : copy.foreign, copy.berthDays, state.berthDays, 'text', 'number');
  if (String(state.client || '').trim()) full(copy.client, state.client);
  full(copy.inPoint, state.inBoarding || '—', 34);
  full(copy.outPoint, state.outBoarding || '—', 34);
  add(() => '', 8);

  const header = add((r) => cell(`A${r}`, copy.itemNo, 8) + cell(`B${r}`, copy.item, 8) + cell(`C${r}`, '', 8) + cell(`D${r}`, copy.amount, 8), 25);
  merges.push(`B${header}:C${header}`);
  const feeItems = [
    [copy.pilot, result.pilot.regularAmount],
    ...(result.pilot.outOvertimeAmount ? [[copy.pilotOvertime, result.pilot.outOvertimeAmount]] : []),
    [copy.tug, result.tug.amount],
    [copy.tax, result.tax.amount], [copy.berth, result.berth.amount],
    ...(result.extraFees || []).map((fee) => [lang === 'en' ? fee.nameEn || fee.nameZh : fee.nameZh || fee.nameEn, fee.amount]),
  ];
  const firstFee = rowNo + 1;
  feeItems.forEach(([name, amount], index) => {
    const striped = index % 2 === 1;
    const textStyle = striped ? 9 : 4;
    const amountStyle = striped ? 10 : 5;
    const nameLength = Array.from(String(name || '')).length;
    const height = Math.max(24, Math.min(88, Math.ceil(nameLength / 36) * 17 + 8));
    const r = add((n) => numeric(`A${n}`, index + 1, 12) + cell(`B${n}`, name || '—', textStyle) + cell(`C${n}`, '', textStyle) + numeric(`D${n}`, amount, amountStyle), height);
    merges.push(`B${r}:C${r}`);
  });
  const lastFee = rowNo;
  const totalRow = add((r) => cell(`A${r}`, copy.total, 6) + cell(`B${r}`, '', 6) + cell(`C${r}`, '', 6) +
    formula(`D${r}`, `ROUND(SUM(D${firstFee}:D${lastFee}),2)`, total), 30);
  merges.push(`A${totalRow}:C${totalRow}`);
  const usdRow = add((r) => cell(`A${r}`, copy.usd, 6) + cell(`B${r}`, '', 6) + cell(`C${r}`, '', 6) +
    formula(`D${r}`, `ROUND(D${totalRow}/B5,2)`, Math.round(total / rate * 100) / 100), 29);
  merges.push(`A${usdRow}:C${usdRow}`);

  const notes = String(state.notes || '').trim();
  if (notes) {
    add(() => '', 8);
    section(copy.notes);
    const chars = Array.from(notes);
    for (let start = 0; start < chars.length; start += 180) {
      const part = chars.slice(start, start + 180).join('');
      const r = add((n) => cell(`A${n}`, part) + cell(`B${n}`, '') + cell(`C${n}`, '') + cell(`D${n}`, ''), 51);
      merges.push(`A${r}:D${r}`);
    }
  }
  for (const [currency, title] of [['cny', copy.cnyBank], ['usd', copy.usdBank]]) {
    const detail = state.bankDetails?.[currency] || {};
    const present = [[copy.bank, detail.bank], [copy.account, detail.account], [copy.code, detail.code]]
      .filter(([, value]) => String(value || '').trim());
    if (!present.length) continue;
    add(() => '', 8);
    section(title);
    for (const [label, value] of present) full(label, String(value).trim(), 32, label === copy.account ? 13 : 4);
  }

  const quotationNo = String(state.quotationNo || '—').replaceAll('&', '&&');
  const footer = lang === 'zh' ? `&L报价编号 ${quotationNo}&R第&P页 / 共&N页` : `&LQuotation ${quotationNo}&RPage &P of &N`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="${NS}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/><cols>' +
    '<col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="27" customWidth="1"/>' +
    '<col min="3" max="3" width="22" customWidth="1"/><col min="4" max="4" width="32" customWidth="1"/>' +
    `</cols><sheetData>${rows.join('')}</sheetData>` +
    `<mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${range}"/>`).join('')}</mergeCells>` +
    '<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>' +
    `<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>${xml(footer)}</oddFooter></headerFooter></worksheet>`;
  const zip = new globalThis.JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL_NS}"><sheets><sheet name="${copy.sheet}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/worksheets/sheet1.xml', sheet);
  zip.file('xl/styles.xml', stylesXml());
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function downloadQuoteXlsx(state, result, language = 'zh') {
  const lang = language === 'en' ? 'en' : 'zh';
  const bytes = await buildQuoteXlsx(state, result, lang);
  const blob = new Blob([bytes], { type: MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const vessel = String(state.vesselName || COPY[lang].untitled)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 80);
  const quotationNo = String(state.quotationNo || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 60);
  const suffix = lang === 'zh' ? '港口费用报价_中文' : 'Port_Quotation_English';
  anchor.href = url;
  anchor.download = `${vessel}_${quotationNo ? `${quotationNo}_` : ''}${suffix}_${String(state.quoteDate || '').replace(/[^0-9-]/g, '')}.xlsx`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return bytes;
}

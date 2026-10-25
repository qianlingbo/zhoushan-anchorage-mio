import { calculateQuote, getTugCount } from './calculator.mjs';
import { PREFERENTIAL_COUNTRIES, CHINA_ALIASES, TUG_RATE_BANDS } from './rates-data.mjs';
import { ROUTES } from './routes.mjs';
import { TERMINALS } from './terminal-data.mjs';

const $ = (id) => document.getElementById(id);
let jsZipLoad;

function loadExcelLibrary() {
  if (globalThis.JSZip) return Promise.resolve();
  if (!jsZipLoad) {
    jsZipLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/jszip.min.js';
      script.async = true;
      script.onload = () => globalThis.JSZip ? resolve() : reject(new Error('Excel 组件加载失败'));
      script.onerror = () => reject(new Error('Excel 组件加载失败'));
      document.head.append(script);
    }).catch((error) => { jsZipLoad = null; throw error; });
  }
  return jsZipLoad;
}

const form = $('quote-form');
const storageKey = 'zhoushan-quote-v1';
const money = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const number = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
const booleanFields = ['taxEnabled', 'pilotInNight', 'pilotOutNight', 'pilotInHoliday', 'pilotOutHoliday'];
const fields = ['vesselName', 'nationality', 'nt', 'length', 'exchangeRate', 'portName', 'shipType', 'operation', 'area', 'berthDays', 'inRouteId', 'outRouteId', 'pilotInCount', 'pilotOutCount', 'inLoad', 'outLoad', 'tugInCount', 'tugOutCount', 'tugInOps', 'tugOutOps', 'tugRateOverride', 'taxDays', 'taxRegime', 'taxFactor', 'quoteDate', 'validUntil', 'quotationNo', 'client', 'notes', ...booleanFields];
const bankCurrencies = ['cny', 'usd'];
const bankFields = ['bank', 'account', 'code'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const newState = () => ({
  vesselName: '', nationality: '', nt: '', length: '', exchangeRate: '', portName: '',
  trade: 'foreign', shipType: 'bulk', operation: 'unload', area: '待确认', berthDays: '3',
  inRouteId: '', outRouteId: '', pilotInCount: '1', pilotOutCount: '1', inLoad: 'laden', outLoad: 'ballast',
  tugInCount: '0', tugOutCount: '0', tugInOps: '1', tugOutOps: '1', tugRateOverride: '',
  taxEnabled: true, taxDays: '30', taxRegime: 'preferential', taxFactor: '1',
  pilotInNight: false, pilotOutNight: false, pilotInHoliday: false, pilotOutHoliday: false,
  quoteDate: today(), validUntil: '', quotationNo: `ZS-${today().replaceAll('-', '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
  client: '', notes: '', extraFees: [], bankDetails: {
    cny: { bank: '', account: '', code: '' }, usd: { bank: '', account: '', code: '' },
  }, demo: false, manualIn: false, manualOut: false,
});
let state = newState();
let result = null;
let lastError = '';
let saveTimer;
let toastTimer;
let restoring = false;
let saveFailed = false;
let routePortName = '';

function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}

function focusField(input) {
  for (let parent = input.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
  }
  input.classList.add('invalid');
  input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  input.focus();
}

function safeRestore() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !saved.data || typeof saved.data !== 'object') return;
    for (const key of Object.keys(state)) {
      if (key === 'extraFees') {
        if (Array.isArray(saved.data.extraFees)) state.extraFees = saved.data.extraFees.filter((fee) => fee && typeof fee === 'object').map((fee) => ({
          nameZh: typeof fee.nameZh === 'string' ? fee.nameZh : '',
          nameEn: typeof fee.nameEn === 'string' ? fee.nameEn : '',
          amount: typeof fee.amount === 'string' ? fee.amount : '',
        }));
        continue;
      }
      if (key === 'bankDetails') {
        for (const currency of bankCurrencies) {
          for (const field of bankFields) {
            const value = saved.data.bankDetails?.[currency]?.[field];
            state.bankDetails[currency][field] = typeof value === 'string' ? value : '';
          }
        }
        continue;
      }
      if (typeof saved.data[key] === typeof state[key]) state[key] = saved.data[key];
    }
    const oldRouteId = saved.data.routeId;
    if (ROUTES.some((route) => route.id === oldRouteId)) {
      if (typeof saved.data.inRouteId !== 'string') state.inRouteId = oldRouteId;
      if (typeof saved.data.outRouteId !== 'string') state.outRouteId = oldRouteId;
    }
    $('save-status').textContent = '已恢复此设备上的草稿';
  } catch { $('save-status').textContent = '当前浏览器无法恢复草稿'; }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, data: state }));
      saveFailed = false;
      $('save-status').textContent = '草稿已保存至当前设备';
    } catch {
      saveFailed = true;
      $('save-status').textContent = '当前浏览器无法保存草稿';
    }
  }, 350);
}

function readForm() {
  for (const key of fields) state[key] = booleanFields.includes(key) ? $(key).checked : $(key).value;
  for (const currency of bankCurrencies) {
    for (const field of bankFields) state.bankDetails[currency][field] = $(`bank-${currency}-${field}`).value;
  }
}

function writeForm() {
  restoring = true;
  rebuildRouteOptions();
  for (const key of fields) {
    if (booleanFields.includes(key)) $(key).checked = state[key];
    else $(key).value = state[key];
  }
  for (const currency of bankCurrencies) {
    for (const field of bankFields) $(`bank-${currency}-${field}`).value = state.bankDetails[currency][field];
  }
  renderExtraFeeInputs();
  routePortName = state.portName.trim();
  restoring = false;
  updateTrade();
}

function updateTrade() {
  document.querySelectorAll('[data-trade]').forEach((button) => {
    const selected = button.dataset.trade === state.trade;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  for (const key of booleanFields.filter((key) => key.startsWith('pilot'))) {
    $(key).disabled = state.trade === 'domestic';
    if (state.trade === 'domestic') { state[key] = false; $(key).checked = false; }
  }
}

function suggestTugs(force = false) {
  try {
    const inCount = getTugCount(state.length, state.inLoad, 'in');
    const outCount = getTugCount(state.length, state.outLoad, 'out');
    if (force || !state.manualIn) state.tugInCount = String(inCount);
    if (force || !state.manualOut) state.tugOutCount = String(outCount);
    if (force) { state.manualIn = false; state.manualOut = false; }
    $('tugInCount').value = state.tugInCount;
    $('tugOutCount').value = state.tugOutCount;
    $('tug-suggestion').textContent = `船长 ${number(state.length)} 米，建议靠泊 ${inCount} 艘 / 离泊 ${outCount} 艘。${state.manualIn || state.manualOut ? '当前含手动调整。' : '可按实际作业修改。'}`;
  } catch { $('tug-suggestion').textContent = '填写船长后自动建议拖轮艘数；可手动修改。'; }
}

function recommendTax() {
  const name = state.nationality.trim();
  const preferred = CHINA_ALIASES.includes(name) || PREFERENTIAL_COUNTRIES.includes(name);
  state.taxRegime = preferred ? 'preferential' : 'ordinary';
  if (name === '利比里亚' && state.quoteDate > '2029-12-10') state.taxRegime = 'ordinary';
  $('taxRegime').value = state.taxRegime;
}

function selectedTerminal() {
  return TERMINALS.find((item) => item.name === state.portName.trim());
}

function selectedRoute(id) {
  const route = ROUTES.find((row) => row.id === id);
  const terminal = selectedTerminal();
  return route && (!terminal || terminal.routeIds.includes(route.id)) ? route : null;
}

function rebuildRouteOptions() {
  const terminal = selectedTerminal();
  const allowed = terminal ? new Set(terminal.routeIds) : null;
  for (const [field, placeholder] of [['inRouteId', '请选择引水登离轮点'], ['outRouteId', '请选择出港引水离轮点']]) {
    const select = $(field);
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = placeholder;
    select.replaceChildren(empty);
    const groups = new Map();
    for (const route of ROUTES) {
      if (allowed && !allowed.has(route.id)) continue;
      if (!groups.has(route.port)) {
        const group = document.createElement('optgroup'); group.label = route.port; groups.set(route.port, group); select.append(group);
      }
      const option = document.createElement('option'); option.value = route.id;
      const ambiguous = ROUTES.some((other) => other.id !== route.id && other.port === route.port && other.workArea === route.workArea && other.boarding === route.boarding && other.sites !== route.sites);
      option.textContent = `${terminal ? '' : `${route.port} / ${route.workArea}${ambiguous ? ` / ${route.sites}` : ''} · `}${route.boarding} · ${number(route.distance)} 海里`;
      groups.get(route.port).append(option);
    }
    if (!selectedRoute(state[field])) state[field] = '';
    select.value = state[field];
  }
  if (state.inRouteId && !state.outRouteId) {
    state.outRouteId = state.inRouteId;
    $('outRouteId').value = state.outRouteId;
  }
}

function useTerminalSelection() {
  const portName = state.portName.trim();
  if (portName !== routePortName) {
    state.inRouteId = state.outRouteId = '';
    routePortName = portName;
    const terminal = selectedTerminal();
    if (terminal?.routeIds.length === 1) {
      state.inRouteId = state.outRouteId = terminal.routeIds[0];
    }
  }
  rebuildRouteOptions();
}

function renderExtraFeeInputs() {
  const rows = state.extraFees.map((fee, index) => {
    const row = document.createElement('div'); row.className = 'extra-fee-entry';
    for (const [field, label] of [['nameZh', '中文名称'], ['nameEn', '英文名称（选填）'], ['amount', '人民币金额']]) {
      const wrapper = document.createElement('label'); wrapper.textContent = label;
      const input = document.createElement('input');
      input.dataset.extraField = field; input.dataset.index = String(index); input.value = fee[field];
      if (field === 'amount') {
        input.type = 'number'; input.min = '0'; input.step = 'any'; input.inputMode = 'decimal'; input.required = true; input.placeholder = '0.00';
      } else { input.type = 'text'; input.maxLength = 100; input.placeholder = field === 'nameZh' ? '如：代理费' : 'e.g. Agency fee'; }
      wrapper.append(input); row.append(wrapper);
    }
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'extra-fee-remove';
    remove.dataset.removeExtraFee = String(index); remove.setAttribute('aria-label', `删除第 ${index + 1} 项费用`); remove.title = '删除费用'; remove.textContent = '×';
    row.append(remove);
    return row;
  });
  if (!rows.length) {
    const empty = document.createElement('p'); empty.className = 'extra-fee-help'; empty.textContent = '尚未添加额外费用。'; rows.push(empty);
  }
  $('extra-fee-fields').replaceChildren(...rows);
}

function renderExtraFeePreview(fees) {
  const rows = fees.map((fee) => {
    const row = document.createElement('div'); row.className = 'fee-row';
    const icon = document.createElement('span'); icon.className = 'fee-icon'; icon.textContent = '＋';
    const content = document.createElement('div');
    const heading = document.createElement('h3'); heading.textContent = fee.nameZh || fee.nameEn;
    if (fee.nameZh && fee.nameEn) { const english = document.createElement('span'); english.textContent = fee.nameEn; heading.append(english); }
    content.append(heading);
    const amount = document.createElement('strong'); amount.textContent = money(fee.amount);
    row.append(icon, content, amount);
    return row;
  });
  $('extra-fee-preview').replaceChildren(...rows);
}

function calculationState() {
  const inRoute = selectedRoute(state.inRouteId);
  const outRoute = selectedRoute(state.outRouteId);
  if (!inRoute) throw new Error('请选择引水登离轮点。');
  if (!outRoute) throw new Error('请选择出港引水离轮点。');
  const routeName = inRoute.port === outRoute.port && inRoute.workArea === outRoute.workArea
    ? `${inRoute.port} / ${inRoute.workArea}`
    : `进港 ${inRoute.port} / ${inRoute.workArea}；出港 ${outRoute.port} / ${outRoute.workArea}`;
  return {
    ...state, routeName,
    inDistance: inRoute.distance, outDistance: outRoute.distance,
    inBoarding: inRoute.boarding, outBoarding: outRoute.boarding,
    tugRateOverride: state.tugRateOverride.trim() === '' ? null : state.tugRateOverride,
  };
}

function clearResult() {
  ['pilot', 'tug', 'tax', 'berth'].forEach((key) => { $(`${key}-amount`).textContent = '—'; });
  $('pilot-detail').textContent = '进港 + 出港引航';
  $('tug-detail').textContent = '按船长与载况计算';
  $('tax-detail').textContent = '按净吨、税率与期限计算';
  $('berth-detail').textContent = '0.25 × 净吨 × 天数';
  $('total-amount').textContent = '—';
  $('usd-amount').textContent = '—';
  $('extra-fee-preview').replaceChildren();
  $('quote-warnings').hidden = true;
}

function render() {
  $('demo-badge').hidden = !state.demo;
  $('preview-vessel').textContent = state.vesselName.trim() || '等待录入船舶';
  $('preview-meta').textContent = [state.trade === 'foreign' ? '外贸航线' : '内贸航线', state.nationality, state.nt ? `${number(state.nt)} NT` : '', state.length ? `${number(state.length)} m` : '', state.portName].filter(Boolean).join(' · ');
  const rate = Number(state.exchangeRate);
  $('fx-label').textContent = state.exchangeRate && Number.isFinite(rate) && rate > 0 ? `1 USD = ${number(rate)} CNY` : '请填写汇率';
  const terminal = selectedTerminal();
  const inRoute = selectedRoute(state.inRouteId);
  const outRoute = selectedRoute(state.outRouteId);
  $('port-hint').textContent = terminal ? `官网名单：${terminal.port} / ${terminal.workArea}；请核对引航登离轮点` : '可从官网码头 / 船厂名单选择，也可自行输入';
  $('in-route-hint').textContent = inRoute
    ? `${inRoute.boarding} · 官网里程 ${number(inRoute.distance)} 海里${inRoute.note ? `；${inRoute.note}` : ''}`
    : !state.portName.trim() ? '先选择码头或船厂。' : terminal ? `${terminal.routeIds.length} 条官网路线可选，请选择引水点。` : '自填码头请从官网路线中选择引水点。';
  $('out-route-hint').textContent = outRoute
    ? `${outRoute.boarding} · 官网里程 ${number(outRoute.distance)} 海里${outRoute.note ? `；${outRoute.note}` : ''}`
    : terminal ? `${terminal.routeIds.length} 条官网路线可选，请选择出港离轮点。` : '自填码头请从官网路线中选择出港离轮点。';
  document.querySelector('.route-default-note').textContent = inRoute && outRoute && inRoute.id !== outRoute.id
    ? `当前出港点位：${outRoute.boarding}（${number(outRoute.distance)} 海里）；可在特殊情况中调整。`
    : '进出港默认同一点位；出港不同可在特殊情况中调整。';
  const countries = [...CHINA_ALIASES, ...PREFERENTIAL_COUNTRIES];
  $('tax-country-hint').textContent = state.nationality ? `${countries.includes(state.nationality.trim()) ? '该船籍在参考站优惠名单' : '该船籍不在参考站优惠名单'}；当前按${state.taxRegime === 'preferential' ? '优惠' : '普通'}税率` : '按船籍推荐，可手动调整';
  ['taxDays', 'taxRegime', 'taxFactor'].forEach((id) => { $(id).disabled = !state.taxEnabled; });
  try {
    const quoteState = calculationState();
    result = calculateQuote(quoteState);
    lastError = '';
    for (const key of ['pilot', 'tug', 'tax', 'berth']) $(`${key}-amount`).textContent = money(result[key].amount);
    renderExtraFeePreview(result.extraFees || []);
    $('pilot-detail').textContent = `进 ${number(quoteState.inDistance)} / 出 ${number(quoteState.outDistance)} 海里 · ${state.pilotInCount}+${state.pilotOutCount} 次`;
    $('tug-detail').textContent = `${number(result.tug.rate)} 元/艘次 · 靠${state.tugInCount} / 离${state.tugOutCount}艘${state.tugRateOverride ? ' · 手动单价' : ''}`;
    $('tax-detail').textContent = state.taxEnabled ? `${state.taxDays}日 · ${state.taxRegime === 'preferential' ? '优惠' : '普通'} · ${result.tax.rate}元/净吨${Number(state.taxFactor) === .5 ? ' · 50%' : ''}` : '本航次不计入吨税';
    $('berth-detail').textContent = `0.25 × ${number(state.nt)} NT × ${number(state.berthDays)} 天`;
    const parts = money(result.total).split('.');
    $('total-amount').replaceChildren(document.createTextNode(parts[0]));
    const decimals = document.createElement('small'); decimals.textContent = `.${parts[1]}`; $('total-amount').append(decimals);
    $('usd-amount').textContent = Number.isFinite(rate) && rate > 0 && Number.isFinite(result.total / rate) ? `USD ${money(result.total / rate)}` : '—';
    const warnings = [...result.warnings];
    if (state.manualIn || state.manualOut) warnings.push('拖轮艘数已手动调整，以当前输入计费。');
    if (state.demo) warnings.push('当前为示例船舶和示例汇率，请替换为实际资料。');
    if (state.nationality === '利比里亚' && state.quoteDate > '2029-12-10') warnings.push('利比里亚已超出参考站标注优惠有效期，请核实适用税率。');
    result.warnings = warnings;
    $('quote-warnings').replaceChildren(...warnings.map((warning) => { const p = document.createElement('p'); p.textContent = warning; return p; }));
    $('quote-warnings').hidden = warnings.length === 0;
  } catch (error) {
    result = null;
    lastError = error.message;
    clearResult();
  }
  const missing = ['vesselName', 'nationality', 'nt', 'length', 'exchangeRate', 'portName'].some((key) => !String(state[key]).trim());
  $('validation-message').textContent = missing ? '填写船舶资料并选择引水点后，费用自动计算。' : lastError || '费用已自动计算，可导出报价。';
  $('validation-message').classList.toggle('error', !missing && !!lastError);
  if (!missing && !lastError && (!Number.isFinite(rate) || rate <= 0)) {
    $('validation-message').textContent = '汇率必须为大于 0 的有效数字。';
    $('validation-message').classList.add('error');
  }
}

function updateRateTable() {
  let previous = 0;
  const rows = TUG_RATE_BANDS.map((band, i) => {
    const row = document.createElement('tr');
    const label = i === 0 ? '≤ 80' : band.max === Infinity ? `> ${previous}` : `> ${previous}，≤ ${band.max}`;
    for (const value of [label, ...band[state.trade].map((value) => number(value))]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    previous = band.max;
    return row;
  });
  $('tug-rate-table').querySelector('tbody').replaceChildren(...rows);
}

for (const country of ['中国', '巴拿马', '马绍尔群岛', ...PREFERENTIAL_COUNTRIES]) {
  const option = document.createElement('option'); option.value = country; $('nationalities').append(option);
}
for (const terminal of TERMINALS) {
  const option = document.createElement('option'); option.value = terminal.name; option.label = `${terminal.port} / ${terminal.workArea}`;
  $('terminals').append(option);
}

form.addEventListener('input', (event) => {
  if (bankCurrencies.includes(event.target.dataset.bankCurrency) && bankFields.includes(event.target.dataset.bankField)) {
    state.bankDetails[event.target.dataset.bankCurrency][event.target.dataset.bankField] = event.target.value;
    save(); return;
  }
  if (event.target.dataset.extraField) {
    const fee = state.extraFees[Number(event.target.dataset.index)];
    if (!fee) return;
    fee[event.target.dataset.extraField] = event.target.value;
    event.target.classList.remove('invalid');
    render(); save(); return;
  }
  if (restoring || !fields.includes(event.target.id)) return;
  const previousInRouteId = state.inRouteId;
  readForm();
  event.target.classList.remove('invalid');
  if (event.target.id === 'inRouteId' && (!state.outRouteId || state.outRouteId === previousInRouteId)) {
    state.outRouteId = state.inRouteId;
    $('outRouteId').value = state.outRouteId;
  }
  if (event.target.id === 'vesselName' && !/示例|EXAMPLE/i.test(state.vesselName)) {
    state.demo = false;
    if (['此为示例报价，船舶参数和汇率仅供试算。', '此为示例报价，船舶参数、汇率和区域仅供试算。'].includes(state.notes)) { state.notes = ''; $('notes').value = ''; }
  }
  if (event.target.id === 'tugInCount') state.manualIn = true;
  if (event.target.id === 'tugOutCount') state.manualOut = true;
  if (['length', 'inLoad', 'outLoad', 'tugInCount', 'tugOutCount'].includes(event.target.id)) {
    if (event.target.id === 'inLoad') { state.manualIn = false; state.operation = 'custom'; $('operation').value = 'custom'; }
    if (event.target.id === 'outLoad') { state.manualOut = false; state.operation = 'custom'; $('operation').value = 'custom'; }
    suggestTugs();
  }
  if (event.target.id === 'nationality') recommendTax();
  if (event.target.id === 'portName') useTerminalSelection();
  if (event.target.id === 'operation') {
    if (state.operation !== 'custom') {
      state.inLoad = state.operation === 'unload' ? 'laden' : 'ballast';
      state.outLoad = state.operation === 'unload' ? 'ballast' : 'laden';
      $('inLoad').value = state.inLoad; $('outLoad').value = state.outLoad; suggestTugs(true);
    }
  }
  render(); save();
});

form.addEventListener('change', (event) => {
  if (event.target.id !== 'portName') return;
  readForm(); useTerminalSelection(); render(); save();
});

$('add-extra-fee').addEventListener('click', () => {
  state.extraFees.push({ nameZh: '其他费用', nameEn: 'Other charge', amount: '0' });
  renderExtraFeeInputs(); render(); save();
  const input = $('extra-fee-fields').querySelectorAll('[data-extra-field="nameZh"]')[state.extraFees.length - 1];
  input?.focus(); input?.select();
});
$('extra-fee-fields').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-extra-fee]');
  if (!button) return;
  state.extraFees.splice(Number(button.dataset.removeExtraFee), 1);
  renderExtraFeeInputs(); render(); save();
});

document.querySelectorAll('[data-trade]').forEach((button) => button.addEventListener('click', () => {
  state.trade = button.dataset.trade; updateTrade(); render(); save();
}));
$('auto-tugs').addEventListener('click', () => { readForm(); suggestTugs(true); render(); save(); toast('已恢复按船长和载况建议的拖轮艘数'); });
$('example').addEventListener('click', () => {
  state = { ...newState(), vesselName: 'OCEAN EXAMPLE / 示例轮', nationality: '新加坡', nt: '18000', length: '200', exchangeRate: '7.20', portName: '老塘山散货码头（示例）', area: '中部港区', demo: true, notes: '此为示例报价，船舶参数和汇率仅供试算。' };
  const sampleRoute = ROUTES.find((route) => route.workArea === '老塘山作业区' && route.distance === 14);
  if (sampleRoute) { state.inRouteId = sampleRoute.id; state.outRouteId = sampleRoute.id; }
  writeForm(); suggestTugs(true); render(); save(); toast('已载入示例；船舶资料和汇率请按实际修改');
});
$('reset').addEventListener('click', () => { state = newState(); writeForm(); render(); save(); form.querySelectorAll('.invalid').forEach((input) => input.classList.remove('invalid')); toast('已清空并新建报价'); });

document.querySelectorAll('[data-open-rates]').forEach((button) => button.addEventListener('click', () => { updateRateTable(); $('rates-dialog').showModal(); }));
$('close-rates').addEventListener('click', () => $('rates-dialog').close());
$('rates-dialog').addEventListener('click', (event) => { if (event.target === $('rates-dialog')) { const rect = $('rates-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('rates-dialog').close(); } });

form.addEventListener('submit', async (event) => {
  event.preventDefault(); readForm(); render();
  const language = event.submitter?.dataset.exportLanguage === 'en' ? 'en' : 'zh';
  const blankText = ['vesselName', 'nationality', 'portName', 'quotationNo'].find((key) => !state[key].trim());
  if (blankText) { focusField($(blankText)); toast('船名、国籍、码头和报价编号不得为空'); return; }
  if (state.validUntil && state.validUntil < state.quoteDate) {
    focusField($('validUntil')); toast('报价有效期不能早于报价日期'); return;
  }
  const inputs = [...form.querySelectorAll('input,select,textarea')].filter((input) => !input.disabled);
  const invalid = inputs.find((input) => !input.checkValidity());
  if (invalid) {
    focusField(invalid); invalid.reportValidity(); toast('请检查必填项及输入数值'); return;
  }
  const fx = Number(state.exchangeRate);
  if (!result || !Number.isFinite(fx) || fx <= 0 || !Number.isFinite(result.total / fx)) { toast(lastError || '请检查汇率和报价参数'); return; }
  const buttons = [...form.querySelectorAll('[data-export-language]')];
  const labels = buttons.map((button) => button.textContent);
  buttons.forEach((button) => { button.disabled = true; });
  const button = event.submitter || $('export-xlsx-zh'); button.textContent = '正在生成 Excel…';
  try {
    const quoteState = calculationState();
    const [{ downloadQuoteXlsx }] = await Promise.all([
      import('./xlsx-export.mjs?v=20261025-quote2'), loadExcelLibrary(),
    ]);
    await downloadQuoteXlsx(quoteState, result, language);
    toast(`${language === 'en' ? '英文' : '中文'} Excel 报价单已生成并下载`);
  } catch (error) { toast(`Excel 生成失败：${error.message}`); }
  finally {
    buttons.forEach((item, index) => { item.disabled = false; item.textContent = labels[index]; });
  }
});

safeRestore(); writeForm(); suggestTugs(); render();
window.addEventListener('beforeunload', () => { if (!saveFailed) { try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, data: state })); } catch {} } });

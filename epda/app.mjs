import { calculateQuote, getTugCount } from './calculator.mjs';
import { PREFERENTIAL_COUNTRIES, CHINA_ALIASES, TUG_RATE_BANDS } from './rates-data.mjs';
import { ROUTES } from './routes.mjs';
import { downloadQuotePdf } from './pdf-export.mjs';

const $ = (id) => document.getElementById(id);
const form = $('quote-form');
const storageKey = 'zhoushan-quote-v1';
const money = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const number = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
const booleanFields = ['taxEnabled', 'pilotInNight', 'pilotOutNight', 'pilotInHoliday', 'pilotOutHoliday'];
const fields = ['vesselName', 'nationality', 'nt', 'length', 'exchangeRate', 'portName', 'shipType', 'operation', 'area', 'berthDays', 'routeId', 'inDistance', 'outDistance', 'pilotInCount', 'pilotOutCount', 'inLoad', 'outLoad', 'tugInCount', 'tugOutCount', 'tugInOps', 'tugOutOps', 'tugRateOverride', 'taxDays', 'taxRegime', 'taxFactor', 'quoteDate', 'quotationNo', 'client', 'notes', ...booleanFields];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const newState = () => ({
  vesselName: '', nationality: '', nt: '', length: '', exchangeRate: '', portName: '',
  trade: 'foreign', shipType: 'bulk', operation: 'unload', area: '待确认', berthDays: '3', routeId: 'custom',
  inDistance: '10', outDistance: '10', pilotInCount: '1', pilotOutCount: '1', inLoad: 'laden', outLoad: 'ballast',
  tugInCount: '0', tugOutCount: '0', tugInOps: '1', tugOutOps: '1', tugRateOverride: '',
  taxEnabled: true, taxDays: '30', taxRegime: 'preferential', taxFactor: '1',
  pilotInNight: false, pilotOutNight: false, pilotInHoliday: false, pilotOutHoliday: false,
  quoteDate: today(), quotationNo: `ZS-${today().replaceAll('-', '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
  client: '', notes: '', demo: false, manualIn: false, manualOut: false,
});
let state = newState();
let result = null;
let lastError = '';
let saveTimer;
let toastTimer;
let restoring = false;
let saveFailed = false;

function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}

function safeRestore() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !saved.data || typeof saved.data !== 'object') return;
    for (const key of Object.keys(state)) {
      if (typeof saved.data[key] === typeof state[key]) state[key] = saved.data[key];
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
}

function writeForm() {
  restoring = true;
  for (const key of fields) {
    if (booleanFields.includes(key)) $(key).checked = state[key];
    else $(key).value = state[key];
  }
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

function routeInfo() {
  const route = ROUTES.find((row) => row.id === state.routeId);
  if (!route) return { routeName: '自定义引航距离', inBoarding: '', outBoarding: '' };
  return {
    routeName: `${route.port} / ${route.workArea}`,
    inBoarding: route.boarding,
    outBoarding: route.boarding,
  };
}

function calculationState() {
  return { ...state, ...routeInfo(), tugRateOverride: state.tugRateOverride.trim() === '' ? null : state.tugRateOverride };
}

function clearResult() {
  ['pilot', 'tug', 'tax', 'berth'].forEach((key) => { $(`${key}-amount`).textContent = '—'; });
  $('pilot-detail').textContent = '进港 + 出港引航';
  $('tug-detail').textContent = '按船长与载况计算';
  $('tax-detail').textContent = '按净吨、税率与期限计算';
  $('berth-detail').textContent = '0.25 × 净吨 × 天数';
  $('total-amount').textContent = '—';
  $('usd-amount').textContent = '—';
  $('quote-warnings').hidden = true;
}

function render() {
  $('demo-badge').hidden = !state.demo;
  $('preview-vessel').textContent = state.vesselName.trim() || '等待录入船舶';
  $('preview-meta').textContent = [state.trade === 'foreign' ? '外贸航线' : '内贸航线', state.nationality, state.nt ? `${number(state.nt)} NT` : '', state.length ? `${number(state.length)} m` : '', state.portName].filter(Boolean).join(' · ');
  const rate = Number(state.exchangeRate);
  $('fx-label').textContent = state.exchangeRate && Number.isFinite(rate) && rate > 0 ? `1 USD = ${number(rate)} CNY` : '请填写汇率';
  const route = ROUTES.find((row) => row.id === state.routeId);
  $('route-hint').textContent = route ? `${route.sites}；登离轮点：${route.boarding}，官网距离 ${number(route.distance)} 海里。实际进出港距离可修改。${route.note ? ` ${route.note}` : ''}` : '可选择官网路线带入距离，也可分别修改进出港距离。区域不会自动决定距离。';
  const countries = [...CHINA_ALIASES, ...PREFERENTIAL_COUNTRIES];
  $('tax-country-hint').textContent = state.nationality ? `${countries.includes(state.nationality.trim()) ? '该船籍在参考站优惠名单' : '该船籍不在参考站优惠名单'}；当前按${state.taxRegime === 'preferential' ? '优惠' : '普通'}税率` : '按船籍推荐，可手动调整';
  ['taxDays', 'taxRegime', 'taxFactor'].forEach((id) => { $(id).disabled = !state.taxEnabled; });
  try {
    result = calculateQuote(calculationState());
    lastError = '';
    for (const key of ['pilot', 'tug', 'tax', 'berth']) $(`${key}-amount`).textContent = money(result[key].amount);
    $('pilot-detail').textContent = `进 ${number(state.inDistance)} / 出 ${number(state.outDistance)} 海里 · ${state.pilotInCount}+${state.pilotOutCount} 次`;
    $('tug-detail').textContent = `${number(result.tug.rate)} 元/艘次 · 靠${state.tugInCount} / 离${state.tugOutCount}艘${state.tugRateOverride ? ' · 手动单价' : ''}`;
    $('tax-detail').textContent = state.taxEnabled ? `${state.taxDays}日 · ${state.taxRegime === 'preferential' ? '优惠' : '普通'} · ${result.tax.rate}元/净吨${Number(state.taxFactor) === .5 ? ' · 50%' : ''}` : '本航次不计入吨税';
    $('berth-detail').textContent = `0.25 × ${number(state.nt)} NT × ${number(state.berthDays)} 天`;
    const parts = money(result.total).split('.');
    $('total-amount').replaceChildren(document.createTextNode(parts[0]));
    const decimals = document.createElement('small'); decimals.textContent = `.${parts[1]}`; $('total-amount').append(decimals);
    $('usd-amount').textContent = Number.isFinite(rate) && rate > 0 && Number.isFinite(result.total / rate) ? `USD ${money(result.total / rate)}` : '—';
    const warnings = [...result.warnings];
    if (state.manualIn || state.manualOut) warnings.push('拖轮艘数已手动调整，以当前输入计费。');
    if (state.area === '待确认') warnings.push('码头所属区域尚待确认；引航按当前距离计算。');
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
  $('validation-message').textContent = missing ? '填写船名、国籍、净吨、船长、汇率与码头后即可导出。' : lastError || '报价已更新，可以导出 PDF。';
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
const portGroups = new Map();
for (const route of ROUTES) {
  if (!portGroups.has(route.port)) {
    const group = document.createElement('optgroup'); group.label = route.port; portGroups.set(route.port, group); $('routeId').append(group);
  }
  const option = document.createElement('option'); option.value = route.id; option.textContent = `${route.workArea} ← ${route.boarding} · ${number(route.distance)} 海里`;
  const ambiguous = ROUTES.some((other) => other.id !== route.id && other.port === route.port && other.workArea === route.workArea && other.boarding === route.boarding && other.sites !== route.sites);
  if (ambiguous) option.textContent = `${route.workArea} · ${route.sites} ← ${route.boarding} · ${number(route.distance)} 海里`;
  portGroups.get(route.port).append(option);
}

form.addEventListener('input', (event) => {
  if (restoring || !fields.includes(event.target.id)) return;
  readForm();
  event.target.classList.remove('invalid');
  if (event.target.id === 'vesselName' && !/示例|EXAMPLE/i.test(state.vesselName)) {
    state.demo = false;
    if (state.notes === '此为示例报价，船舶参数、汇率和区域仅供试算。') { state.notes = ''; $('notes').value = ''; }
  }
  if (event.target.id === 'tugInCount') state.manualIn = true;
  if (event.target.id === 'tugOutCount') state.manualOut = true;
  if (['length', 'inLoad', 'outLoad', 'tugInCount', 'tugOutCount'].includes(event.target.id)) {
    if (event.target.id === 'inLoad') { state.manualIn = false; state.operation = 'custom'; $('operation').value = 'custom'; }
    if (event.target.id === 'outLoad') { state.manualOut = false; state.operation = 'custom'; $('operation').value = 'custom'; }
    suggestTugs();
  }
  if (event.target.id === 'nationality') recommendTax();
  if (event.target.id === 'operation') {
    if (state.operation !== 'custom') {
      state.inLoad = state.operation === 'unload' ? 'laden' : 'ballast';
      state.outLoad = state.operation === 'unload' ? 'ballast' : 'laden';
      $('inLoad').value = state.inLoad; $('outLoad').value = state.outLoad; suggestTugs(true);
    }
  }
  if (event.target.id === 'routeId') {
    const route = ROUTES.find((row) => row.id === state.routeId);
    if (route) {
      state.inDistance = String(route.distance); state.outDistance = String(route.distance);
      $('inDistance').value = state.inDistance; $('outDistance').value = state.outDistance;
    }
  }
  render(); save();
});

document.querySelectorAll('[data-trade]').forEach((button) => button.addEventListener('click', () => {
  state.trade = button.dataset.trade; updateTrade(); render(); save();
}));
$('auto-tugs').addEventListener('click', () => { readForm(); suggestTugs(true); render(); save(); toast('已恢复按船长和载况建议的拖轮艘数'); });
$('example').addEventListener('click', () => {
  state = { ...newState(), vesselName: 'OCEAN EXAMPLE / 示例轮', nationality: '新加坡', nt: '18000', length: '200', exchangeRate: '7.20', portName: '老塘山散货码头（示例）', area: '中部港区', demo: true, notes: '此为示例报价，船舶参数、汇率和区域仅供试算。' };
  const sampleRoute = ROUTES.find((route) => route.workArea === '老塘山作业区' && route.distance === 14);
  if (sampleRoute) { state.routeId = sampleRoute.id; state.inDistance = '14'; state.outDistance = '14'; }
  writeForm(); suggestTugs(true); render(); save(); toast('已载入示例；船舶、汇率与区域请按实际修改');
});
$('reset').addEventListener('click', () => { state = newState(); writeForm(); render(); save(); form.querySelectorAll('.invalid').forEach((input) => input.classList.remove('invalid')); toast('已清空并新建报价'); });

document.querySelectorAll('[data-open-rates]').forEach((button) => button.addEventListener('click', () => { updateRateTable(); $('rates-dialog').showModal(); }));
$('close-rates').addEventListener('click', () => $('rates-dialog').close());
$('rates-dialog').addEventListener('click', (event) => { if (event.target === $('rates-dialog')) { const rect = $('rates-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('rates-dialog').close(); } });

form.addEventListener('submit', async (event) => {
  event.preventDefault(); readForm(); render();
  const blankText = ['vesselName', 'nationality', 'portName', 'quotationNo'].find((key) => !state[key].trim());
  if (blankText) { $(blankText).classList.add('invalid'); $(blankText).focus(); toast('船名、国籍、码头和报价编号不得为空'); return; }
  const inputs = [...form.querySelectorAll('input,select,textarea')].filter((input) => !input.disabled);
  const invalid = inputs.find((input) => !input.checkValidity());
  if (invalid) {
    invalid.classList.add('invalid'); invalid.scrollIntoView({ block: 'center', behavior: 'smooth' }); invalid.focus(); invalid.reportValidity(); toast('请检查必填项及输入数值'); return;
  }
  const fx = Number(state.exchangeRate);
  if (!result || !Number.isFinite(fx) || fx <= 0 || !Number.isFinite(result.total / fx)) { toast(lastError || '请检查汇率和报价参数'); return; }
  const button = $('export'); button.disabled = true; button.textContent = '正在生成 PDF…';
  try {
    await downloadQuotePdf(calculationState(), result);
    toast('PDF 报价单已生成并下载');
  } catch (error) { toast(`PDF 生成失败：${error.message}`); }
  finally {
    button.disabled = false; button.replaceChildren();
    const icon = document.createElement('span'); icon.textContent = '↓'; const arrow = document.createElement('span'); arrow.textContent = '↗';
    button.append(icon, document.createTextNode(' 导出 PDF 报价单 '), arrow);
  }
});

safeRestore(); writeForm(); suggestTugs(); render();
window.addEventListener('beforeunload', () => { if (!saveFailed) { try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, data: state })); } catch {} } });

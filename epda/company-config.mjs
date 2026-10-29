import { PILOT_RULES, TUG_RATE_BANDS, TAX_RATES } from './rates-data.mjs';

const rate = (value, label) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new Error(`${label}必须为非负数。`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw new Error(`${label}必须为非负数。`);
  return result;
};

const text = (value, label, maxLength) => {
  if (typeof value !== 'string' || value.length > maxLength) throw new Error(`${label}格式无效。`);
  return value.trim();
};

const bankDetails = () => ({
  cny: { bank: '', account: '', code: '' },
  usd: { bank: '', account: '', code: '' },
});

export function createDefaultCompanyConfig(id = 'default', name = '默认公司') {
  return {
    version: 1, id, name,
    modules: { pilot: true, tug: true, tax: true, berth: true },
    pilot: {
      foreignBands: PILOT_RULES.foreign.bands.map((band) => band.rate),
      foreignAdditionalRate: PILOT_RULES.foreign.additionalRate,
      foreignDistanceRate: PILOT_RULES.foreign.distanceRate,
      domesticRate: PILOT_RULES.domestic.rate,
      domesticDistanceRate: PILOT_RULES.domestic.distanceRate,
      overtimeRate: 0.45,
    },
    tugRates: TUG_RATE_BANDS.map((row) => ({ foreign: [...row.foreign], domestic: [...row.domestic] })),
    taxRates: TAX_RATES.map((row) => ({
      ordinary: { ...row.ordinary }, preferential: { ...row.preferential },
    })),
    berthRate: 0.25,
    fixedFees: [], bankDetails: bankDetails(),
  };
}

export function validateCompanyConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new Error('公司配置版本无效。');
  const id = text(input.id, '公司标识', 80);
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) throw new Error('公司标识格式无效。');
  const name = text(input.name, '公司名称', 80);
  if (!name) throw new Error('请填写公司名称。');
  if (!input.modules || typeof input.modules !== 'object') throw new Error('费用模块配置无效。');
  const modules = {};
  for (const key of ['pilot', 'tug', 'tax', 'berth']) {
    if (typeof input.modules[key] !== 'boolean') throw new Error(`${key}模块开关无效。`);
    modules[key] = input.modules[key];
  }
  if (!input.pilot || typeof input.pilot !== 'object' || !Array.isArray(input.pilot.foreignBands) || input.pilot.foreignBands.length !== 3) {
    throw new Error('引航费率配置无效。');
  }
  const pilot = {
    foreignBands: input.pilot.foreignBands.map((value, index) => rate(value, `外贸引航第${index + 1}档费率`)),
    foreignAdditionalRate: rate(input.pilot.foreignAdditionalRate, '外贸引航非基本港附加费率'),
    foreignDistanceRate: rate(input.pilot.foreignDistanceRate, '外贸引航超程费率'),
    domesticRate: rate(input.pilot.domesticRate, '内贸引航基本费率'),
    domesticDistanceRate: rate(input.pilot.domesticDistanceRate, '内贸引航超程费率'),
    overtimeRate: rate(input.pilot.overtimeRate, '出港引航加班费率'),
  };
  if (!Array.isArray(input.tugRates) || input.tugRates.length !== TUG_RATE_BANDS.length) throw new Error('拖轮费率档位配置无效。');
  const tugRates = input.tugRates.map((row, index) => {
    const entry = {};
    for (const trade of ['foreign', 'domestic']) {
      if (!Array.isArray(row?.[trade]) || row[trade].length !== 3) throw new Error(`拖轮第${index + 1}档费率配置无效。`);
      entry[trade] = row[trade].map((value, column) => rate(value, `拖轮第${index + 1}档第${column + 1}列费率`));
    }
    return entry;
  });
  if (!Array.isArray(input.taxRates) || input.taxRates.length !== TAX_RATES.length) throw new Error('吨税费率档位配置无效。');
  const taxRates = input.taxRates.map((row, index) => {
    const entry = {};
    for (const regime of ['ordinary', 'preferential']) {
      if (!row?.[regime] || typeof row[regime] !== 'object') throw new Error(`吨税第${index + 1}档费率配置无效。`);
      entry[regime] = {};
      for (const days of [30, 90, 365]) entry[regime][days] = rate(row[regime][days], `吨税第${index + 1}档${days}日费率`);
    }
    return entry;
  });
  const berthRate = rate(input.berthRate, '靠泊费率');
  if (!Array.isArray(input.fixedFees) || input.fixedFees.length > 100) throw new Error('固定费用配置无效。');
  const fixedFees = input.fixedFees.map((fee, index) => {
    if (!fee || typeof fee !== 'object') throw new Error(`第${index + 1}项固定费用无效。`);
    const nameZh = text(fee.nameZh, '固定费用中文名', 100);
    const nameEn = text(fee.nameEn, '固定费用英文名', 100);
    if (!nameZh && !nameEn) throw new Error(`第${index + 1}项固定费用请填写名称。`);
    return { nameZh, nameEn, amount: rate(fee.amount, `第${index + 1}项固定费用金额`) };
  });
  if (!input.bankDetails || typeof input.bankDetails !== 'object') throw new Error('汇款资料配置无效。');
  const banks = bankDetails();
  for (const currency of ['cny', 'usd']) {
    for (const field of ['bank', 'account', 'code']) {
      banks[currency][field] = text(input.bankDetails?.[currency]?.[field], `${currency}汇款资料`, field === 'code' ? 100 : 160);
    }
  }
  return { version: 1, id, name, modules, pilot, tugRates, taxRates, berthRate, fixedFees, bankDetails: banks };
}

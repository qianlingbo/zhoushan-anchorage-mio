import { PILOT_RULES, TUG_RATE_BANDS, TUG_COUNTS, TAX_RATES } from './rates-data.mjs';
import { validateCompanyConfig } from './company-config.mjs';

const shipColumns = { container: 0, tanker: 1, bulk: 2 };
const round2 = (value) => {
  if (!Number.isFinite(value) || value * 100 > Number.MAX_SAFE_INTEGER) throw new Error('计算金额过大，请检查输入数据。');
  return Math.round((value + Number.EPSILON) * 100) / 100;
};
const fmt = (value) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value);

function numeric(value, label, { min = 0, positive = false, integer = false } = {}) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${label}不能为空，且必须为有效数字。`);
  }
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${label}必须为有效数字。`);
  if (positive ? result <= 0 : result < min) throw new Error(`${label}${positive ? '必须大于 0' : `不得小于 ${min}`}。`);
  if (integer && !Number.isSafeInteger(result)) throw new Error(`${label}必须为非负整数。`);
  return result;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`${label}无效，请重新选择。`);
  return value;
}

export function getTugRate(length, shipType, trade, companyConfig = null) {
  const loa = numeric(length, '船长', { positive: true });
  oneOf(shipType, Object.keys(shipColumns), '船型');
  oneOf(trade, ['foreign', 'domestic'], '贸易类型');
  const index = TUG_RATE_BANDS.findIndex((row) => loa <= row.max);
  return companyConfig ? validateCompanyConfig(companyConfig).tugRates[index][trade][shipColumns[shipType]]
    : TUG_RATE_BANDS[index][trade][shipColumns[shipType]];
}

export function getTugCount(length, load, direction) {
  const loa = numeric(length, '船长', { positive: true });
  oneOf(load, ['laden', 'half', 'ballast'], '载况');
  oneOf(direction, ['in', 'out'], '靠离泊方向');
  if (loa < 80) return 0;
  const row = TUG_COUNTS.find((band) => loa >= band.min && loa < band.max);
  const column = load === 'laden' ? (direction === 'in' ? 0 : 1) : load === 'half' && direction === 'in' ? 2 : 3;
  return row.counts[column];
}

export function getTaxRate(nt, taxDays, taxRegime, companyConfig = null) {
  const tonnage = numeric(nt, '净吨', { positive: true });
  const days = numeric(taxDays, '吨税期限', { positive: true, integer: true });
  oneOf(days, [30, 90, 365], '吨税期限');
  oneOf(taxRegime, ['preferential', 'ordinary'], '吨税税率类型');
  const index = TAX_RATES.findIndex((row) => tonnage <= row.max);
  return companyConfig ? validateCompanyConfig(companyConfig).taxRates[index][taxRegime][days]
    : TAX_RATES[index][taxRegime][days];
}

export function calculateQuote(state, companyConfig = null) {
  if (!state || typeof state !== 'object') throw new Error('请填写报价参数。');
  const config = companyConfig ? validateCompanyConfig(companyConfig) : null;
  const modules = config ? { ...config.modules } : { pilot: true, tug: true, tax: true, berth: true };
  const pilotRates = config?.pilot ?? {
    foreignBands: PILOT_RULES.foreign.bands.map((band) => band.rate),
    foreignAdditionalRate: PILOT_RULES.foreign.additionalRate,
    foreignDistanceRate: PILOT_RULES.foreign.distanceRate,
    domesticRate: PILOT_RULES.domestic.rate,
    domesticDistanceRate: PILOT_RULES.domestic.distanceRate,
    overtimeRate: 0.45,
  };
  const nt = numeric(state.nt, '净吨', { positive: true });
  const length = numeric(state.length, '船长', { positive: true });
  const shipType = oneOf(state.shipType, Object.keys(shipColumns), '船型');
  const trade = oneOf(state.trade, ['foreign', 'domestic'], '贸易类型');
  if (modules.tug) {
    oneOf(state.inLoad, ['laden', 'half', 'ballast'], '靠泊载况');
    oneOf(state.outLoad, ['laden', 'half', 'ballast'], '离泊载况');
  }
  const inDistance = modules.pilot ? numeric(state.inDistance, '进港引航距离') : 0;
  const outDistance = modules.pilot ? numeric(state.outDistance, '出港引航距离') : 0;
  const pilotInCount = modules.pilot ? numeric(state.pilotInCount, '进港引航次数', { integer: true }) : 0;
  const pilotOutCount = modules.pilot ? numeric(state.pilotOutCount, '出港引航次数', { integer: true }) : 0;
  if (modules.pilot) for (const field of ['pilotInNight', 'pilotOutNight', 'pilotInHoliday', 'pilotOutHoliday', 'pilotOutOvertime']) {
    if (state[field] !== undefined && typeof state[field] !== 'boolean') throw new Error('引航附加选项必须为明确的开关状态。');
  }
  const outOvertimeEnabled = modules.pilot && state.pilotOutOvertime !== false;
  const inSurchargeRate = modules.pilot && trade === 'foreign' ? (state.pilotInNight ? PILOT_RULES.nightSurcharge : 0) + (state.pilotInHoliday ? PILOT_RULES.holidaySurcharge : 0) : 0;
  const outSurchargeRate = modules.pilot && trade === 'foreign' ? (state.pilotOutNight && !outOvertimeEnabled ? PILOT_RULES.nightSurcharge : 0) + (state.pilotOutHoliday ? PILOT_RULES.holidaySurcharge : 0) : 0;
  const tugInCount = modules.tug ? numeric(state.tugInCount, '靠泊拖轮艘数', { integer: true }) : 0;
  const tugOutCount = modules.tug ? numeric(state.tugOutCount, '离泊拖轮艘数', { integer: true }) : 0;
  const tugInOps = modules.tug ? numeric(state.tugInOps, '靠泊拖轮作业次数', { integer: true }) : 0;
  const tugOutOps = modules.tug ? numeric(state.tugOutOps, '离泊拖轮作业次数', { integer: true }) : 0;
  const berthDays = modules.berth ? numeric(state.berthDays, '靠泊天数', { positive: true }) : 0;
  if (modules.tax && typeof state.taxEnabled !== 'boolean') throw new Error('是否计入吨税必须为明确的开关状态。');
  const taxEnabled = modules.tax && state.taxEnabled;
  const taxRate = taxEnabled ? getTaxRate(nt, state.taxDays, state.taxRegime, config) : 0;
  const taxFactor = taxEnabled ? numeric(state.taxFactor, '吨税船型系数', { positive: true }) : 1;
  if (taxEnabled) oneOf(taxFactor, [0.5, 1], '吨税船型系数');
  const autoRate = modules.tug ? getTugRate(length, shipType, trade, config) : 0;
  const tugRate = !modules.tug ? 0 : state.tugRateOverride === null ? autoRate : numeric(state.tugRateOverride, '拖轮单价');

  const billingTonnage = Math.max(Math.ceil(nt), PILOT_RULES[trade].minimumTonnage);
  const billingInDistance = Math.max(PILOT_RULES.includedDistance, Math.ceil(inDistance));
  const billingOutDistance = Math.max(PILOT_RULES.includedDistance, Math.ceil(outDistance));
  const inExtra = billingInDistance - PILOT_RULES.includedDistance;
  const outExtra = billingOutDistance - PILOT_RULES.includedDistance;
  let previousMax = 0;
  const pilotBands = trade === 'foreign' ? PILOT_RULES.foreign.bands.map((band, index) => ({ max: band.max, rate: pilotRates.foreignBands[index] })) : [{ max: Infinity, rate: pilotRates.domesticRate }];
  const segments = pilotBands.map((band) => {
    const tonnage = Math.max(0, Math.min(billingTonnage, band.max) - previousMax);
    const label = previousMax === 0 ? `前${fmt(Math.min(billingTonnage, band.max))}净吨基本费` : `${fmt(previousMax)}—${fmt(Math.min(billingTonnage, band.max))}净吨基本费`;
    previousMax = band.max;
    return {
      label, tonnage, baseRate: band.rate,
      inAmount: tonnage * band.rate * pilotInCount,
      outAmount: tonnage * band.rate * pilotOutCount,
    };
  }).filter((segment) => segment.tonnage > 0);
  const baseFee = segments.reduce((sum, segment) => sum + segment.tonnage * segment.baseRate, 0);
  const portSurcharge = trade === 'foreign' ? billingTonnage * pilotRates.foreignAdditionalRate : 0;
  const distanceRate = trade === 'foreign' ? pilotRates.foreignDistanceRate : pilotRates.domesticDistanceRate;
  const inDistanceFee = billingTonnage * inExtra * distanceRate;
  const outDistanceFee = billingTonnage * outExtra * distanceRate;
  const inSurcharge = round2((baseFee + inDistanceFee) * inSurchargeRate * pilotInCount);
  const outSurcharge = round2((baseFee + outDistanceFee) * outSurchargeRate * pilotOutCount);
  const pilotInAmount = round2(((baseFee + inDistanceFee) * (1 + inSurchargeRate) + portSurcharge) * pilotInCount);
  const pilotOutAmount = round2(((baseFee + outDistanceFee) * (1 + outSurchargeRate) + portSurcharge) * pilotOutCount);
  const outOvertimeBaseAmount = round2((baseFee + outDistanceFee + portSurcharge) * pilotOutCount);
  const outOvertimeAmount = outOvertimeEnabled ? round2(outOvertimeBaseAmount * pilotRates.overtimeRate) : 0;
  const pilotRegularAmount = round2(pilotInAmount + pilotOutAmount);
  const pilotAmount = round2(pilotRegularAmount + outOvertimeAmount);
  const tugAmount = round2(tugRate * (tugInCount * tugInOps + tugOutCount * tugOutOps));
  const taxAmount = taxEnabled ? round2(nt * taxRate * taxFactor) : 0;
  const berthRate = config?.berthRate ?? 0.25;
  const berthAmount = modules.berth ? round2(berthRate * nt * berthDays) : 0;
  if (state.extraFees !== undefined && !Array.isArray(state.extraFees)) throw new Error('额外费用格式无效。');
  const extraFees = (config?.fixedFees ?? []).map((fee) => ({ ...fee, amount: round2(fee.amount) }));
  for (const fee of state.extraFees || []) {
    if (!fee || typeof fee !== 'object') throw new Error('额外费用格式无效。');
    const nameZh = String(fee.nameZh ?? '').trim();
    const nameEn = String(fee.nameEn ?? '').trim();
    const amountText = String(fee.amount ?? '').trim();
    if (!nameZh && !nameEn && !amountText) continue;
    if (!nameZh && !nameEn) throw new Error('额外费用请填写名称。');
    const amount = round2(numeric(amountText, '额外费用金额'));
    extraFees.push({ nameZh, nameEn, amount });
  }
  const extraTotal = round2(extraFees.reduce((sum, fee) => sum + fee.amount, 0));
  const warnings = [];
  if (modules.tug && TUG_RATE_BANDS.some((row) => row.max === length && length !== 80)) {
    warnings.push('船长位于拖轮费率档位边界，初版按上限包含匹配，请核对执行档位。');
  }
  if (modules.tug && length < 80) warnings.push('拖轮配置表首行存在笔误，初版对船长小于80米默认不配置，请核对实际作业。');
  if (modules.pilot && trade === 'domestic' && (state.pilotInNight || state.pilotOutNight || state.pilotInHoliday || state.pilotOutHoliday)) {
    warnings.push('内贸航线未计夜班及节假日引航附加费。');
  }
  return {
    pilot: {
      amount: pilotAmount, regularAmount: pilotRegularAmount, inAmount: pilotInAmount, outAmount: pilotOutAmount,
      outOvertimeAmount, outOvertimeBaseAmount, outOvertimeEnabled, outOvertimeRate: pilotRates.overtimeRate,
      inSurcharge, outSurcharge, inSurchargeRate, outSurchargeRate,
      billingTonnage, billingInDistance, billingOutDistance, baseFee: round2(baseFee),
      portSurcharge: round2(portSurcharge), inDistanceFee: round2(inDistanceFee), outDistanceFee: round2(outDistanceFee),
      segments: segments.map((segment) => ({ ...segment, inAmount: round2(segment.inAmount), outAmount: round2(segment.outAmount) })),
      description: !modules.pilot ? '本公司未启用引航费。' : `${trade === 'foreign' ? '外贸引航' : '内贸引航'}计费 ${fmt(billingTonnage)} 净吨（净吨进整，最低 ${PILOT_RULES[trade].minimumTonnage}）；计费进港 ${fmt(billingInDistance)} 海里 × ${pilotInCount} 次，出港 ${fmt(billingOutDistance)} 海里 × ${pilotOutCount} 次（距离进整，10海里起）。${trade === 'foreign' ? `分档基本费每次最高${fmt(pilotRates.foreignBands.reduce((sum, rate) => sum + 40000 * rate, 0))}元；${fmt(pilotRates.foreignAdditionalRate)}元/净吨非基本港附加与超程费仍按全部计费吨位计算。` : ''}${inSurchargeRate || outSurchargeRate ? `夜班/节假日附加仅乘基本费及超程费：进港 ${fmt(inSurchargeRate * 100)}%，出港 ${fmt(outSurchargeRate * 100)}%。` : ''}${outOvertimeEnabled ? `按本公司报价口径，出港原金额 ${fmt(outOvertimeBaseAmount)} 元另加${fmt(pilotRates.overtimeRate * 100)}%加班费 ${fmt(outOvertimeAmount)} 元，不重复计出港夜班附加。` : ''}`,
    },
    tug: {
      amount: tugAmount, rate: tugRate, inCount: tugInCount, outCount: tugOutCount,
      description: modules.tug ? `${fmt(tugRate)} 元/艘次 ×（靠泊 ${tugInCount} 艘 × ${tugInOps} 次 + 离泊 ${tugOutCount} 艘 × ${tugOutOps} 次）${state.tugRateOverride === null ? '' : '；手动单价'}。` : '本公司未启用拖轮费。',
    },
    tax: {
      amount: taxAmount, rate: taxRate,
      description: !modules.tax ? '本公司未启用船舶吨税。' : taxEnabled ? `${fmt(nt)} 净吨 × ${fmt(taxRate)} 元/净吨 × ${fmt(taxFactor * 100)}%；${state.taxDays} 日${state.taxRegime === 'preferential' ? '优惠' : '普通'}税率。` : '本次报价不计入吨税。',
    },
    berth: { amount: berthAmount, rate: berthRate, description: modules.berth ? `${fmt(berthRate)} 元/净吨·天 × ${fmt(nt)} 净吨 × ${fmt(berthDays)} 天。` : '本公司未启用靠泊费。' },
    extraFees,
    modules,
    total: round2(pilotAmount + tugAmount + taxAmount + berthAmount + extraTotal),
    warnings,
  };
}

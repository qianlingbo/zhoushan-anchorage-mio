import { PILOT_RULES, TUG_RATE_BANDS, TUG_COUNTS, TAX_RATES } from './rates-data.mjs';

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

export function getTugRate(length, shipType, trade) {
  const loa = numeric(length, '船长', { positive: true });
  oneOf(shipType, Object.keys(shipColumns), '船型');
  oneOf(trade, ['foreign', 'domestic'], '贸易类型');
  return TUG_RATE_BANDS.find((row) => loa <= row.max)[trade][shipColumns[shipType]];
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

export function getTaxRate(nt, taxDays, taxRegime) {
  const tonnage = numeric(nt, '净吨', { positive: true });
  const days = numeric(taxDays, '吨税期限', { positive: true, integer: true });
  oneOf(days, [30, 90, 365], '吨税期限');
  oneOf(taxRegime, ['preferential', 'ordinary'], '吨税税率类型');
  return TAX_RATES.find((row) => tonnage <= row.max)[taxRegime][days];
}

export function calculateQuote(state) {
  if (!state || typeof state !== 'object') throw new Error('请填写报价参数。');
  const nt = numeric(state.nt, '净吨', { positive: true });
  const length = numeric(state.length, '船长', { positive: true });
  const shipType = oneOf(state.shipType, Object.keys(shipColumns), '船型');
  const trade = oneOf(state.trade, ['foreign', 'domestic'], '贸易类型');
  oneOf(state.inLoad, ['laden', 'half', 'ballast'], '靠泊载况');
  oneOf(state.outLoad, ['laden', 'half', 'ballast'], '离泊载况');
  const inDistance = numeric(state.inDistance, '进港引航距离');
  const outDistance = numeric(state.outDistance, '出港引航距离');
  const pilotInCount = numeric(state.pilotInCount, '进港引航次数', { integer: true });
  const pilotOutCount = numeric(state.pilotOutCount, '出港引航次数', { integer: true });
  for (const field of ['pilotInNight', 'pilotOutNight', 'pilotInHoliday', 'pilotOutHoliday', 'pilotOutOvertime']) {
    if (state[field] !== undefined && typeof state[field] !== 'boolean') throw new Error('引航附加选项必须为明确的开关状态。');
  }
  const outOvertimeEnabled = state.pilotOutOvertime !== false;
  const inSurchargeRate = trade === 'foreign' ? (state.pilotInNight ? PILOT_RULES.nightSurcharge : 0) + (state.pilotInHoliday ? PILOT_RULES.holidaySurcharge : 0) : 0;
  const outSurchargeRate = trade === 'foreign' ? (state.pilotOutNight && !outOvertimeEnabled ? PILOT_RULES.nightSurcharge : 0) + (state.pilotOutHoliday ? PILOT_RULES.holidaySurcharge : 0) : 0;
  const tugInCount = numeric(state.tugInCount, '靠泊拖轮艘数', { integer: true });
  const tugOutCount = numeric(state.tugOutCount, '离泊拖轮艘数', { integer: true });
  const tugInOps = numeric(state.tugInOps, '靠泊拖轮作业次数', { integer: true });
  const tugOutOps = numeric(state.tugOutOps, '离泊拖轮作业次数', { integer: true });
  const berthDays = numeric(state.berthDays, '靠泊天数', { positive: true });
  if (typeof state.taxEnabled !== 'boolean') throw new Error('是否计入吨税必须为明确的开关状态。');
  const taxRate = getTaxRate(nt, state.taxDays, state.taxRegime);
  const taxFactor = numeric(state.taxFactor, '吨税船型系数', { positive: true });
  oneOf(taxFactor, [0.5, 1], '吨税船型系数');
  const autoRate = getTugRate(length, shipType, trade);
  const tugRate = state.tugRateOverride === null ? autoRate : numeric(state.tugRateOverride, '拖轮单价');

  const billingTonnage = Math.max(Math.ceil(nt), PILOT_RULES[trade].minimumTonnage);
  const billingInDistance = Math.max(PILOT_RULES.includedDistance, Math.ceil(inDistance));
  const billingOutDistance = Math.max(PILOT_RULES.includedDistance, Math.ceil(outDistance));
  const inExtra = billingInDistance - PILOT_RULES.includedDistance;
  const outExtra = billingOutDistance - PILOT_RULES.includedDistance;
  let previousMax = 0;
  const pilotBands = trade === 'foreign' ? PILOT_RULES.foreign.bands : [{ max: Infinity, rate: PILOT_RULES.domestic.rate }];
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
  const portSurcharge = trade === 'foreign' ? billingTonnage * PILOT_RULES.foreign.additionalRate : 0;
  const distanceRate = PILOT_RULES[trade].distanceRate;
  const inDistanceFee = billingTonnage * inExtra * distanceRate;
  const outDistanceFee = billingTonnage * outExtra * distanceRate;
  const inSurcharge = round2((baseFee + inDistanceFee) * inSurchargeRate * pilotInCount);
  const outSurcharge = round2((baseFee + outDistanceFee) * outSurchargeRate * pilotOutCount);
  const pilotInAmount = round2(((baseFee + inDistanceFee) * (1 + inSurchargeRate) + portSurcharge) * pilotInCount);
  const pilotOutAmount = round2(((baseFee + outDistanceFee) * (1 + outSurchargeRate) + portSurcharge) * pilotOutCount);
  const outOvertimeBaseAmount = round2((baseFee + outDistanceFee + portSurcharge) * pilotOutCount);
  const outOvertimeAmount = outOvertimeEnabled ? round2(outOvertimeBaseAmount * 0.45) : 0;
  const pilotRegularAmount = round2(pilotInAmount + pilotOutAmount);
  const pilotAmount = round2(pilotRegularAmount + outOvertimeAmount);
  const tugAmount = round2(tugRate * (tugInCount * tugInOps + tugOutCount * tugOutOps));
  const taxAmount = state.taxEnabled ? round2(nt * taxRate * taxFactor) : 0;
  const berthAmount = round2(0.25 * nt * berthDays);
  if (state.extraFees !== undefined && !Array.isArray(state.extraFees)) throw new Error('额外费用格式无效。');
  const extraFees = [];
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
  if (TUG_RATE_BANDS.some((row) => row.max === length && length !== 80)) {
    warnings.push('船长位于拖轮费率档位边界，初版按上限包含匹配，请核对执行档位。');
  }
  if (length < 80) warnings.push('拖轮配置表首行存在笔误，初版对船长小于80米默认不配置，请核对实际作业。');
  if (trade === 'domestic' && (state.pilotInNight || state.pilotOutNight || state.pilotInHoliday || state.pilotOutHoliday)) {
    warnings.push('内贸航线未计夜班及节假日引航附加费。');
  }
  return {
    pilot: {
      amount: pilotAmount, regularAmount: pilotRegularAmount, inAmount: pilotInAmount, outAmount: pilotOutAmount,
      outOvertimeAmount, outOvertimeBaseAmount, outOvertimeEnabled,
      inSurcharge, outSurcharge, inSurchargeRate, outSurchargeRate,
      billingTonnage, billingInDistance, billingOutDistance, baseFee: round2(baseFee),
      portSurcharge: round2(portSurcharge), inDistanceFee: round2(inDistanceFee), outDistanceFee: round2(outDistanceFee),
      segments: segments.map((segment) => ({ ...segment, inAmount: round2(segment.inAmount), outAmount: round2(segment.outAmount) })),
      description: `${trade === 'foreign' ? '外贸引航' : '内贸引航'}计费 ${fmt(billingTonnage)} 净吨（净吨进整，最低 ${PILOT_RULES[trade].minimumTonnage}）；计费进港 ${fmt(billingInDistance)} 海里 × ${pilotInCount} 次，出港 ${fmt(billingOutDistance)} 海里 × ${pilotOutCount} 次（距离进整，10海里起）。${trade === 'foreign' ? '分档基本费每次最高44,100元；0.27元/净吨非基本港附加与超程费仍按全部计费吨位计算。' : ''}${inSurchargeRate || outSurchargeRate ? `夜班/节假日附加仅乘基本费及超程费：进港 ${fmt(inSurchargeRate * 100)}%，出港 ${fmt(outSurchargeRate * 100)}%。` : ''}${outOvertimeEnabled ? `按本报价默认口径，出港原金额 ${fmt(outOvertimeBaseAmount)} 元另加45%加班费 ${fmt(outOvertimeAmount)} 元，不重复计出港夜班附加。` : ''}`,
    },
    tug: {
      amount: tugAmount, rate: tugRate, inCount: tugInCount, outCount: tugOutCount,
      description: `${fmt(tugRate)} 元/艘次 ×（靠泊 ${tugInCount} 艘 × ${tugInOps} 次 + 离泊 ${tugOutCount} 艘 × ${tugOutOps} 次）${state.tugRateOverride === null ? '' : '；手动单价'}。`,
    },
    tax: {
      amount: taxAmount, rate: taxRate,
      description: state.taxEnabled ? `${fmt(nt)} 净吨 × ${fmt(taxRate)} 元/净吨 × ${fmt(taxFactor * 100)}%；${state.taxDays} 日${state.taxRegime === 'preferential' ? '优惠' : '普通'}税率。` : '本次报价不计入吨税。',
    },
    berth: { amount: berthAmount, description: `0.25 元/净吨·天 × ${fmt(nt)} 净吨 × ${fmt(berthDays)} 天。` },
    extraFees,
    total: round2(pilotAmount + tugAmount + taxAmount + berthAmount + extraTotal),
    warnings,
  };
}

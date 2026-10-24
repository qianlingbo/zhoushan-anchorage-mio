// 费率来源：用户提供的《拖轮收费.doc》、引航费率网页及 zsagent01 吨税计算器。
export const RATE_SOURCES = {
  pilot: 'https://www.zspilot.com.cn/news_viewn.asp?newsid=603&LM=150',
  tax: 'https://www.zsagent01.com/dues/',
  tug: '拖轮收费.doc',
};

export const PILOT_RULES = {
  surchargeSource: 'https://www.zspilot.com.cn/news_viewn.asp?newsid=2362&LM=150',
  nightSurcharge: 0.45,
  holidaySurcharge: 0.45,
  foreign: {
    bands: [
      { max: 40000, rate: 0.405 },
      { max: 80000, rate: 0.36 },
      { max: 120000, rate: 0.3375 },
    ],
    additionalRate: 0.27,
    distanceRate: 0.004,
    minimumTonnage: 2000,
  },
  domestic: { rate: 0.18, distanceRate: 0.0018, minimumTonnage: 500 },
  includedDistance: 10,
};

// 费率表原件的连接号没有标明边界，初版按每档上限包含处理。
// 数组列序为集装箱、油轮、散杂货船。
export const TUG_RATE_BANDS = [
  { max: 80, foreign: [6000, 5700, 5300], domestic: [3300, 3300, 3000] },
  { max: 120, foreign: [6500, 7800, 7400], domestic: [3700, 4300, 4100] },
  { max: 150, foreign: [7000, 8500, 8000], domestic: [4200, 4900, 4700] },
  { max: 180, foreign: [8000, 10500, 9000], domestic: [4500, 6100, 5100] },
  { max: 220, foreign: [8500, 12000, 11000], domestic: [4800, 6900, 6100] },
  { max: 260, foreign: [9000, 14000, 13000], domestic: [5200, 8500, 7500] },
  { max: 275, foreign: [9500, 16000, 14000], domestic: [5500, 9500, 8000] },
  { max: 300, foreign: [10000, 17000, 15000], domestic: [5700, 10000, 8500] },
  { max: 325, foreign: [10500, 18000, 16000], domestic: [6100, 10500, 9000] },
  { max: 350, foreign: [11000, 18600, 16500], domestic: [6400, 10700, 9400] },
  { max: 390, foreign: [11500, 19600, 17800], domestic: [6700, 11300, 9900] },
  { max: Infinity, foreign: [12000, 20300, 19600], domestic: [7100, 11900, 11300] },
];

// 配置表列序：重载进、重载出、半载进、半载出/空载进/空载出。
export const TUG_COUNTS = [
  { min: 80, max: 120, counts: [1, 1, 1, 1] },
  { min: 120, max: 150, counts: [2, 2, 2, 2] },
  { min: 150, max: 260, counts: [2, 2, 2, 2] },
  { min: 260, max: 275, counts: [3, 3, 2, 2] },
  { min: 275, max: 300, counts: [4, 3, 4, 3] },
  { min: 300, max: 325, counts: [4, 3, 4, 3] },
  { min: 325, max: 350, counts: [5, 4, 4, 3] },
  { min: 350, max: Infinity, counts: [5, 4, 4, 3] },
];

export const TAX_RATES = [
  { max: 2000, ordinary: { 30: 2.1, 90: 4.2, 365: 12.6 }, preferential: { 30: 1.5, 90: 3, 365: 9 } },
  { max: 10000, ordinary: { 30: 4, 90: 8, 365: 24 }, preferential: { 30: 2.9, 90: 5.8, 365: 17.4 } },
  { max: 50000, ordinary: { 30: 4.6, 90: 9.2, 365: 27.6 }, preferential: { 30: 3.3, 90: 6.6, 365: 19.8 } },
  { max: Infinity, ordinary: { 30: 5.3, 90: 10.6, 365: 31.8 }, preferential: { 30: 3.8, 90: 7.6, 365: 22.8 } },
];

export const CHINA_ALIASES = ['中国', '中国大陆', '中华人民共和国'];
export const PREFERENTIAL_COUNTRIES = [
  '阿尔巴尼亚', '朝鲜', '加纳', '斯里兰卡', '刚果（布）', '巴基斯坦', '刚果（金）(原扎伊尔)', '挪威', '日本', '阿尔及利亚', '新西兰', '阿根廷', '孟加拉国', '泰国', '巴西', '墨西哥', '马来西亚', '新加坡', '塞浦路斯', '蒙古', '马耳他', '越南', '土耳其', '韩国', '格鲁吉亚', '克罗地亚', '俄罗斯', '乌克兰', '黎巴嫩', '智利', '印度', '以色列', '加拿大', '秘鲁', '埃及', '摩洛哥', '南非', '古巴', '印度尼西亚', '突尼斯', '伊朗', '巴哈马', '美国', '比利时', '捷克', '丹麦', '德国', '爱沙尼亚', '希腊', '西班牙', '法国', '爱尔兰', '意大利', '拉脱维亚', '立陶宛', '卢森堡', '匈牙利', '荷兰', '奥地利', '波兰', '葡萄牙', '斯洛文尼亚', '斯洛伐克', '芬兰', '瑞典', '英国', '保加利亚', '罗马尼亚', '也门', '苏丹', '菲律宾', '埃塞俄比亚', '肯尼亚', '阿曼', '利比里亚', '香港', '澳门',
];

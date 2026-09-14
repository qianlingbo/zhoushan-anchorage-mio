#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const YEAR = 2026;
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'api');
const source = fs.readFileSync(path.join(ROOT, 'c1-data-2026.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: 'c1-data-2026.js' });
const windowsByDate = context.window.C1_WINDOWS_2026;

const pad = value => String(value).padStart(2, '0');
const dayOfYear = date => Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
const formatMinutes = minutes => minutes === 1440
  ? '24:00'
  : `${pad(Math.floor(minutes / 60) % 24)}:${pad(Math.round(minutes % 60))}`;

function solarEvent(date, zenith, sunrise) {
  const n = dayOfYear(date);
  const longitudeHour = 121.55 / 15;
  const t = n + ((sunrise ? 6 : 18) - longitudeHour) / 24;
  const meanAnomaly = (0.9856 * t) - 3.289;
  let longitude = meanAnomaly
    + 1.916 * Math.sin(meanAnomaly * Math.PI / 180)
    + 0.020 * Math.sin(2 * meanAnomaly * Math.PI / 180)
    + 282.634;
  longitude = (longitude + 360) % 360;
  let rightAscension = Math.atan(0.91764 * Math.tan(longitude * Math.PI / 180)) * 180 / Math.PI;
  rightAscension = (rightAscension + 360) % 360;
  rightAscension += Math.floor(longitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;
  const sinDeclination = 0.39782 * Math.sin(longitude * Math.PI / 180);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHour = (
    Math.cos(zenith * Math.PI / 180)
    - sinDeclination * Math.sin(29.87 * Math.PI / 180)
  ) / (cosDeclination * Math.cos(29.87 * Math.PI / 180));
  const hourAngle = sunrise
    ? 360 - Math.acos(Math.max(-1, Math.min(1, cosHour))) * 180 / Math.PI
    : Math.acos(Math.max(-1, Math.min(1, cosHour))) * 180 / Math.PI;
  const utcHours = (hourAngle / 15 + rightAscension - 0.06571 * t - 6.622 - longitudeHour + 24) % 24;
  return Math.round((((utcHours + 8) % 24) + 24) % 24 * 60);
}

function solarTimes(date) {
  return {
    nauticalDawn: solarEvent(date, 102, true),
    sunrise: solarEvent(date, 90.833, true),
    sunset: solarEvent(date, 90.833, false),
    nauticalDusk: solarEvent(date, 102, false),
  };
}

function timeWindow(start, end, extra = {}) {
  return {
    start: formatMinutes(start),
    end: formatMinutes(end),
    durationMinutes: end - start,
    ...extra,
  };
}

function buildDay(iso, rawWindows) {
  const [year, month, day] = iso.split('-').map(Number);
  const sun = solarTimes(new Date(year, month - 1, day));
  const allowed = rawWindows
    .map(([start, end]) => [Math.max(start, sun.nauticalDawn), Math.min(end, sun.nauticalDusk)])
    .filter(([start, end]) => end > start);
  const slackWindows = rawWindows.map(([start, end]) => {
    const overlapStart = Math.max(start, sun.nauticalDawn);
    const overlapEnd = Math.min(end, sun.nauticalDusk);
    const status = overlapEnd <= overlapStart
      ? 'night_prohibited'
      : overlapStart === start && overlapEnd === end
        ? 'allowed'
        : 'partially_allowed';
    return timeWindow(start, end, { status });
  });

  return {
    date: iso,
    timezone: 'Asia/Shanghai',
    station: {
      name: '马岙航道窄口处 C1 站',
      channelId: 2,
    },
    rule: {
      maxCurrentKnots: 1.5,
      lightLimit: 'nautical_dawn_to_nautical_dusk',
      summary: '允许窗口 = C1 流速 ≤ 1.5 节的缓流时段，与航海曙光始至暮光终时段的交集。',
    },
    light: {
      nauticalDawn: formatMinutes(sun.nauticalDawn),
      sunrise: formatMinutes(sun.sunrise),
      sunset: formatMinutes(sun.sunset),
      nauticalDusk: formatMinutes(sun.nauticalDusk),
    },
    slackWindows,
    allowedWindows: allowed.map(([start, end]) => timeWindow(start, end)),
    passageAllowed: allowed.length > 0,
    advisory: '本结果仅供航行计划参考，不代替引航、VTS 指令、现场气象海况核验或通航许可。',
    sources: {
      current: 'http://hai.tsphp.com/?',
      light: `https://www.timeanddate.com/sun/china/ningbo?month=${month}&year=${YEAR}`,
      website: `https://www.zsagent01.com/guanmen/?date=${iso}`,
    },
  };
}

fs.mkdirSync(OUTPUT, { recursive: true });
const dates = Object.keys(windowsByDate).sort();
for (const iso of dates) {
  const payload = buildDay(iso, windowsByDate[iso]);
  fs.writeFileSync(path.join(OUTPUT, `${iso}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

const index = {
  name: 'Guanmen Passage Window API',
  description: '2026 年马岙航道窄口处 C1 站大型船舶允许过灌门时间。',
  timezone: 'Asia/Shanghai',
  supportedFrom: dates[0],
  supportedTo: dates[dates.length - 1],
  dateEndpoint: 'https://www.zsagent01.com/guanmen/api/{YYYY-MM-DD}.json',
  skill: 'https://www.zsagent01.com/guanmen/skill/guanmen-passage/SKILL.md',
  example: 'https://www.zsagent01.com/guanmen/api/2026-09-01.json',
};
fs.writeFileSync(path.join(OUTPUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`wrote ${dates.length} daily API files to ${OUTPUT}`);

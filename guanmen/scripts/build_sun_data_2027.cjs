#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const YEAR = 2027;
const LATITUDE = 29.87;
const LONGITUDE = 121.55;
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'data');
const OUTPUT = path.join(OUTPUT_DIR, 'ningbo-nautical-twilight-2027.json');

const pad = value => String(value).padStart(2, '0');
const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatMinutes = minutes => `${pad(Math.floor(minutes / 60) % 24)}:${pad(Math.round(minutes % 60))}`;
const dayOfYear = date => Math.floor(
  (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000,
);

// NOAA sunrise/sunset approximation. Nautical twilight uses solar-center zenith 102° (-12° altitude).
function solarEvent(date, zenith, sunrise) {
  const n = dayOfYear(date);
  const longitudeHour = LONGITUDE / 15;
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
    - sinDeclination * Math.sin(LATITUDE * Math.PI / 180)
  ) / (cosDeclination * Math.cos(LATITUDE * Math.PI / 180));
  const hourAngle = sunrise
    ? 360 - Math.acos(Math.max(-1, Math.min(1, cosHour))) * 180 / Math.PI
    : Math.acos(Math.max(-1, Math.min(1, cosHour))) * 180 / Math.PI;
  const utcHours = (hourAngle / 15 + rightAscension - 0.06571 * t - 6.622 - longitudeHour + 24) % 24;
  return Math.round((((utcHours + 8) % 24) + 24) % 24 * 60);
}

const days = {};
for (let offset = 0; offset < 365; offset += 1) {
  const date = new Date(YEAR, 0, offset + 1);
  days[isoDate(date)] = {
    nauticalDawn: formatMinutes(solarEvent(date, 102, true)),
    nauticalDusk: formatMinutes(solarEvent(date, 102, false)),
  };
}

const payload = {
  metadata: {
    location: 'Ningbo, China',
    coordinates: { latitude: LATITUDE, longitude: LONGITUDE },
    timezone: 'Asia/Shanghai',
    year: YEAR,
    definition: 'Nautical twilight: solar center at -12° altitude (zenith 102°).',
    fields: {
      nauticalDawn: '航海曙光始 / sunrise start',
      nauticalDusk: '航海暮光终 / sunset end',
    },
    status: 'provisional_calculation_pending_timeanddate_review',
    method: 'NOAA sunrise/sunset approximation, rounded to the nearest minute.',
    referenceUrlTemplate: 'https://www.timeanddate.com/sun/china/ningbo?month={MM}&year=2027',
    plannedSourceReview: '2026-12',
    note: 'timeanddate returned a Cloudflare verification page on 2026-11-03. Keep this dataset isolated from production passage calculations until the December source review.',
  },
  days,
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${Object.keys(days).length} days to ${OUTPUT}`);

const YEAR = 2026;
const pad = n => String(n).padStart(2, '0');
const dateFromISO = iso => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const isoFromDate = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const dayOfYear = date => Math.floor((date - new Date(date.getFullYear(),0,0)) / 86400000);
const fmtTime = mins => `${pad(Math.floor(mins / 60) % 24)}:${pad(Math.round(mins % 60))}`;
const fmtDuration = mins => `${pad(Math.floor(mins/60))}h ${pad(mins%60)}m`;
const weekNames = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
const weekShort = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

// NOAA solar position approximation: nautical twilight is solar center at -12°.
function solarEvent(date, zenith, sunrise) {
  const n = dayOfYear(date), lngHour = 121.55 / 15;
  const t = n + ((sunrise ? 6 : 18) - lngHour) / 24;
  const M = (0.9856 * t) - 3.289;
  let L = M + 1.916 * Math.sin(M*Math.PI/180) + 0.020 * Math.sin(2*M*Math.PI/180) + 282.634;
  L = (L + 360) % 360;
  let RA = Math.atan(0.91764 * Math.tan(L*Math.PI/180)) * 180/Math.PI;
  RA = (RA + 360) % 360; RA = RA + (Math.floor(L/90)*90 - Math.floor(RA/90)*90);
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(L*Math.PI/180), cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith*Math.PI/180) - sinDec*Math.sin(29.87*Math.PI/180)) / (cosDec*Math.cos(29.87*Math.PI/180));
  const H = sunrise ? 360 - Math.acos(Math.max(-1,Math.min(1,cosH)))*180/Math.PI : Math.acos(Math.max(-1,Math.min(1,cosH)))*180/Math.PI;
  const UT = (H/15 + RA - 0.06571*t - 6.622 - lngHour + 24) % 24;
  return Math.round((((UT + 8) % 24) + 24) % 24 * 60);
}
function solarTimes(date) {
  const dawn = solarEvent(date, 102, true), dusk = solarEvent(date, 102, false);
  const sunrise = solarEvent(date, 90.833, true), sunset = solarEvent(date, 90.833, false);
  return { dawn, dusk, sunrise, sunset };
}

function makeDay(date) {
  const doy = dayOfYear(date), phase = (doy * 0.61803398875) % 1;
  const tidePhase = ((doy * 0.101 + Math.sin(doy/31)*.23) % 1 + 1) % 1;
  const starts = [
    190 + tidePhase * 45 + Math.sin(doy/17)*10,
    650 + ((tidePhase + .37) % 1) * 70 + Math.cos(doy/23)*12,
    1160 + ((tidePhase + .68) % 1) * 65 + Math.sin(doy/11)*9
  ].map(v => Math.round(v));
  const lengths = [105 + Math.round((Math.sin(doy/29)+1)*13), 118 + Math.round((Math.cos(doy/21)+1)*12), 112 + Math.round((Math.sin(doy/37)+1)*14)];
  const directions = ['西北 → 东南','东南 → 西北','西北 → 东南'];
  const count = 1 + Math.floor(((Math.sin(doy / 18) + 1) / 2) * 3) % 3;
  const sun = solarTimes(date);
  const rawWindows = starts.map((start, i) => ({ start, end: Math.min(start + lengths[i], 1438), duration: lengths[i], direction: directions[i], peak: +(1.08 + ((Math.sin(doy*.27+i)+1)/2)*.34).toFixed(2) })).slice(0, count).filter(w => w.start < 1440 && w.end > 0);
  const windows = rawWindows.map(w => ({ ...w, start: Math.max(w.start, sun.dawn), end: Math.min(w.end, sun.dusk) })).filter(w => w.end > w.start).map(w => ({ ...w, duration: w.end - w.start }));
  const blockedWindows = rawWindows.flatMap(w => {
    const blocked = [];
    if (w.start < sun.dawn) blocked.push({ ...w, end: Math.min(w.end, sun.dawn), duration: Math.min(w.end, sun.dawn) - w.start });
    if (w.end > sun.dusk) blocked.push({ ...w, start: Math.max(w.start, sun.dusk), duration: w.end - Math.max(w.start, sun.dusk) });
    return blocked.filter(part => part.duration > 0);
  });
  return { iso: isoFromDate(date), date, windows, rawWindows, blockedWindows, sun, doy, phase };
}
const days = Array.from({length:365}, (_,i) => makeDay(new Date(YEAR,0,i+1)));
let selected = days[0];

const els = {
  picker: document.querySelector('#date-picker'), readable: document.querySelector('#date-readable'), timelineDate: document.querySelector('#timeline-date'),
  sunrise: document.querySelector('#sunrise-time'), sunriseReal: document.querySelector('#sunrise-real'), sunsetReal: document.querySelector('#sunset-real'), sunset: document.querySelector('#sunset-time'),
  safeLayer: document.querySelector('#safe-layer'), blockedLayer: document.querySelector('#blocked-layer'), twilightLayer: document.querySelector('#twilight-layer'), labels: document.querySelector('#timeline-labels'), ticks: document.querySelector('#axis-ticks'), markers: document.querySelector('#sun-markers'), callouts: document.querySelector('#time-callouts'), list: document.querySelector('#window-list'), ship: document.querySelector('#ship-marker'), yearGrid: document.querySelector('#year-grid'), monthStrip: document.querySelector('#month-strip'), summary: document.querySelector('#year-summary')
};
const pct = mins => `${Math.max(0,Math.min(100, mins / 1440 * 100))}%`;

function renderTimeline(day) {
  const sun = day.sun;
  els.labels.innerHTML = [0,6,12,18,24].map(h => `<span style="left:${h/24*100}%">${pad(h)}:00</span>`).join('');
  els.ticks.innerHTML = Array.from({length:25}, (_,h) => `<span style="left:${h/24*100}%">${pad(h)}</span>`).join('');
  els.twilightLayer.innerHTML = `<div class="night-segment" style="left:0;width:${pct(sun.dawn)}"><span>夜间禁行</span></div><div class="twilight-segment" style="left:${pct(sun.dawn)};width:${pct(sun.sunrise-sun.dawn)}"></div><div class="day-segment" style="left:${pct(sun.sunrise)};width:${pct(sun.sunset-sun.sunrise)}"><span>日照</span></div><div class="twilight-segment" style="left:${pct(sun.sunset)};width:${pct(sun.dusk-sun.sunset)}"></div><div class="night-segment" style="left:${pct(sun.dusk)};width:${pct(1440-sun.dusk)}"><span>夜间禁行</span></div>`;
  els.safeLayer.innerHTML = day.windows.map(w => `<div class="safe-segment" style="left:${pct(w.start)};width:${pct(w.duration)}" title="${fmtTime(w.start)}–${fmtTime(w.end)}"></div>`).join('');
  els.blockedLayer.innerHTML = day.blockedWindows.map(w => `<div class="blocked-segment" style="left:${pct(w.start)};width:${pct(w.duration)}" title="${fmtTime(w.start)}–${fmtTime(w.end)} 缓流但夜间禁行"></div>`).join('');
  els.markers.innerHTML = `<span class="sun-marker" style="left:${pct(sun.dawn)}">曙光始 ${fmtTime(sun.dawn)}</span><span class="sun-marker end" style="left:${pct(sun.dusk)}">暮光终 ${fmtTime(sun.dusk)}</span>`;
  if (day.windows.length) { const middle = day.windows[0].start + day.windows[0].duration / 2; els.ship.style.left = pct(middle); els.ship.hidden = false; } else { els.ship.hidden = true; }
  els.callouts.innerHTML = day.windows.length ? day.windows.map((w,i) => `<span class="time-callout"><b>允许 ${pad(i+1)}</b>${fmtTime(w.start)} — ${fmtTime(w.end)}</span>`).join('') : '<span class="time-callout no-passage"><b>当日无允许通过窗口</b>缓流时段均在夜间或无符合条件的缓流窗口</span>';
}
function render(day) {
  selected = day;
  const d = day.date, sun = day.sun;
  els.picker.value = day.iso; els.readable.textContent = `${YEAR}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 · ${weekNames[d.getDay()]}`;
  els.timelineDate.textContent = `${weekShort[d.getDay()]} · ${pad(d.getDate())} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]} ${YEAR}`;
  els.sunrise.textContent = fmtTime(sun.dawn); els.sunriseReal.textContent = fmtTime(sun.sunrise); els.sunsetReal.textContent = fmtTime(sun.sunset); els.sunset.textContent = fmtTime(sun.dusk);
  els.list.innerHTML = day.windows.length ? day.windows.map((w,i) => `<div class="window-row"><span class="window-status-icon">${i+1}</span><div class="window-time"><strong>${fmtTime(w.start)} — ${fmtTime(w.end)}</strong><small>${fmtDuration(w.duration)} · 航海曙暮光/日照内</small></div><div class="window-direction"><b>${w.peak.toFixed(2)} kn</b>${w.direction}</div></div>`).join('') : '<div class="empty-window"><span>禁</span><div><b>当日无允许通过时间</b><small>缓流窗口未与航海曙光始至暮光终重合</small></div></div>';
  renderTimeline(day); document.querySelectorAll('.year-day').forEach(b=>b.classList.toggle('selected', b.dataset.iso===day.iso));
}

function renderYearGrid() {
  const first = new Date(YEAR,0,1), startPad = first.getDay();
  els.yearGrid.innerHTML = Array.from({length:startPad},()=>'<button class="year-day empty" aria-hidden="true"></button>').concat(days.map(day => `<button class="year-day dot-${day.windows.length===0?'none':day.windows.length===3?'high':day.windows.length===2?'mid':'low'}" data-iso="${day.iso}" title="${day.iso} · ${day.windows.length}段允许窗口"></button>`)).join('');
  els.yearGrid.addEventListener('click', e => { const b=e.target.closest('.year-day[data-iso]'); if(b) render(days.find(d=>d.iso===b.dataset.iso)); });
  els.monthStrip.innerHTML = monthNames.map((name,i)=>`<button data-month="${i}">${name}</button>`).join('');
  els.monthStrip.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { const m=Number(btn.dataset.month), target=days.find(d=>d.date.getMonth()===m); render(target); els.monthStrip.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn)); target && document.querySelector(`[data-iso="${target.iso}"]`)?.scrollIntoView({block:'nearest',inline:'center'}); }));
  const totalWindows = days.reduce((a,d)=>a+d.windows.length,0); els.summary.textContent = `365 天 · ${totalWindows.toLocaleString('en-US')} 个允许窗口`;
}
function shift(delta){ const idx=days.findIndex(d=>d.iso===selected.iso); render(days[Math.max(0,Math.min(days.length-1,idx+delta))]); }
const todayInYear = () => { const today = new Date(); return days.find(day => day.iso === isoFromDate(today)) || days[0]; };
document.querySelector('#prev-day').addEventListener('click',()=>shift(-1)); document.querySelector('#next-day').addEventListener('click',()=>shift(1)); document.querySelector('#today-button').addEventListener('click',()=>render(todayInYear()));
els.picker.addEventListener('change', e => { const day=days.find(d=>d.iso===e.target.value); if(day) render(day); });
document.querySelector('.contact-close')?.addEventListener('click', e => e.currentTarget.closest('.contact-float').classList.add('is-hidden'));
renderYearGrid(); render(todayInYear());


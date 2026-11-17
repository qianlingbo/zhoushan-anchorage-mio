import { CHAPTERS } from './journey.mjs';

export const REGION_IDS = CHAPTERS.map(chapter => chapter.id);
export const CAST = ['白衣观音', '莲台菩萨', '牛魔王', '天宫仙官', '桃花仙子', '云游老仙', '花果山小猴', '巡山猴将'];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const regionAt = u => Math.min(REGION_IDS.length - 1, Math.max(0, Math.floor(u)));
function randomFor(seed) { let n = Number(seed) >>> 0; return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function createScrollState(seed = Math.floor(Math.random() * 4294967296), chapter = 'nantian') {
  const random = randomFor(seed), npcs = [];
  // Deal each portrait once across the whole scroll, never clone it in another realm.
  const cast = CAST.map((_, index) => index);
  for (let i = cast.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [cast[i],cast[j]] = [cast[j],cast[i]]; }
  REGION_IDS.forEach((id, region) => {
    const cell = cast[region], u = region + .30 + random() * .25;
    npcs.push({ key: `${id}-visitor`, chapter: id, cell, speaker: CAST[cell], u, home: u, direction: random() < .5 ? -1 : 1, speed: .008 + random() * .009, distance: 0, moving: false, caseIndex: Math.floor(random() * Object.keys(CHAPTERS[region].encounters).length) });
    if (region >= 1 && region <= 4) npcs.push({ key: `${id}-king`, chapter: id, king: region - 1, speaker: CHAPTERS[region].host, u: region + .88, home: region + .88, direction: -1, speed: .006, distance: 0, moving: false, caseIndex: 0 });
  });
  const index = Math.max(0, REGION_IDS.indexOf(chapter));
  return { seed, u: index + .08, direction: 1, destination: null, height: 0, velocity: 0, distance: 0, moving: false, time: 0, npcs, freeze: 0, flight: null };
}
export function nearestNpc(state, range = .065) {
  return state.npcs.reduce((nearest, npc) => Math.abs(npc.u - state.u) <= range && (!nearest || Math.abs(npc.u - state.u) < Math.abs(nearest.u - state.u)) ? npc : nearest, null);
}
export function npcEncounter(npc) {
  const chapter = CHAPTERS.find(item => item.id === npc.chapter), entries = Object.entries(chapter.encounters), [id, lines] = entries[npc.caseIndex % entries.length];
  return { id, chapter: npc.chapter, speaker: npc.speaker, label: lines[0], npcId: npc.key };
}
export function beginCloud(state, chapter) {
  if (state.flight) return false;
  const index = chapter === undefined ? (regionAt(state.u) + 1) % REGION_IDS.length : REGION_IDS.indexOf(chapter);
  if (index < 0) return false;
  const target = index + .08;
  state.flight = { from: state.u, to: target, elapsed: 0, duration: clamp(Math.abs(target - state.u) * .65, 1.7, 4.5) };
  state.destination = null; state.velocity = 0; return true;
}
export function advanceScrollState(state, dt, { paused = false, axis = 0, run = false, reducedMotion = false } = {}) {
  if (paused) return state;
  dt = clamp(Number(dt) || 0,0,.05); state.time += dt; state.freeze = Math.max(0,state.freeze - dt);
  const before = state.u;
  if (state.flight) {
    const flight = state.flight; flight.elapsed = Math.min(flight.duration, flight.elapsed + dt);
    const t = flight.elapsed / flight.duration, ease = t * t * (3 - 2 * t);
    state.u = flight.from + (flight.to - flight.from) * ease;
    state.height = Math.sin(Math.PI * t) * (reducedMotion ? .08 : .19);
    if (t >= 1) { state.u = flight.to; state.height = 0; state.flight = null; }
  } else {
    const speed = run ? .34 : .21;
    if (axis) { state.destination = null; state.u += clamp(axis,-1,1) * speed * dt; }
    else if (state.destination !== null) {
      const difference = state.destination - state.u;
      state.u += Math.sign(difference) * Math.min(Math.abs(difference),speed * dt);
      if (Math.abs(state.destination - state.u) < .001) { state.u = state.destination; state.destination = null; }
    }
    state.u = clamp(state.u,.035,REGION_IDS.length - .035);
    if (state.height > 0 || state.velocity > 0) { state.velocity -= 2.5 * dt; state.height = Math.max(0,state.height + state.velocity * dt); if (!state.height) state.velocity = 0; }
  }
  const travelled = state.u - before; state.moving = Math.abs(travelled) > .000001;
  if (state.moving) state.direction = Math.sign(travelled);
  state.distance += Math.abs(travelled);
  for (const npc of state.npcs) {
    npc.moving = !reducedMotion && !state.freeze && Math.abs(state.u - npc.u) > .075;
    if (!npc.moving) continue;
    const next = clamp(npc.u + npc.direction * npc.speed * dt,npc.home - .035,npc.home + .035);
    npc.distance += Math.abs(next - npc.u); npc.u = next;
    if (next <= npc.home - .035 || next >= npc.home + .035) npc.direction *= -1;
  }
  return state;
}

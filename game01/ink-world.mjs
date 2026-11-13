import { CHAPTERS } from './journey.mjs';
import { PAINTED_CHAPTERS } from './painted-chapters.mjs';

// Playable paintings: positions are fractions of each horizontal path.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const RIGHT = ['KeyD', 'KeyW', 'ArrowRight', 'ArrowUp'];
const LEFT = ['KeyA', 'KeyS', 'ArrowLeft', 'ArrowDown'];
export function createInkState() {
  return { u: .3, npc: .62, npcDirection: 1, direction: 1, destination: null, height: 0, velocity: 0, distance: 0, npcDistance: 0, moving: false, npcMoving: false, time: 0, caseIndex: 0 };
}
export function advanceInkState(state, dt, { paused = false, axis = 0, run = false, reducedMotion = false } = {}) {
  if (paused) return state;
  dt = clamp(Number(dt) || 0, 0, .05); state.time += dt;
  const before = state.u, speed = run ? .17 : .095;
  if (axis) { state.destination = null; state.u += clamp(axis, -1, 1) * speed * dt; }
  else if (state.destination !== null) {
    const difference = state.destination - state.u;
    state.u += Math.sign(difference) * Math.min(Math.abs(difference), speed * dt);
    if (Math.abs(state.destination - state.u) < .001) { state.u = state.destination; state.destination = null; }
  }
  state.u = clamp(state.u, .08, .92);
  const travelled = state.u - before; state.moving = Math.abs(travelled) > .000001;
  if (state.moving) state.direction = Math.sign(travelled);
  state.distance += Math.abs(travelled);
  state.npcMoving = !reducedMotion && Math.abs(state.u - state.npc) > .075;
  if (state.npcMoving) {
    const next = clamp(state.npc + state.npcDirection * .009 * dt, .52, .78);
    state.npcDistance += Math.abs(next - state.npc); state.npc = next;
    if (next <= .52 || next >= .78) state.npcDirection *= -1;
  }
  if (state.height > 0 || state.velocity > 0) {
    state.velocity -= 2.5 * dt; state.height = Math.max(0, state.height + state.velocity * dt);
    if (!state.height) state.velocity = 0;
  }
  return state;
}

export class InkWorld {
  constructor(canvas, { onReady, onNear, onInteract, reducedMotion = false } = {}) {
    this.canvas = canvas; this.callbacks = { onReady, onNear, onInteract }; this.reducedMotion = reducedMotion;
    this.document = canvas.ownerDocument; this.window = this.document.defaultView; this.state = createInkState();
    this.keys = new Set(); this.input = { x: 0, z: 0, run: false }; this.removers = []; this.paused = true;
    this.ctx = canvas.getContext('2d'); this.ready = false; this.disposed = false; this.near = null; this.generation = 0;
    if (!this.ctx) { queueMicrotask(() => this.fail('无法启动绘画场景。')); return; }
    this.resize(); this.bindInput();
    this.common = this.loadImage('./assets/ink/journey-figures-v1.png').then(figures => {
      if (!this.disposed) { this.figures = figures; this.spriteBounds = this.trimSprites(); }
    }).catch(error => { this.commonError = error; });
    const tick = time => {
      if (this.disposed) return;
      const dt = this.lastTime === undefined ? 0 : (time - this.lastTime) / 1000; this.lastTime = time;
      if (!this.paused && this.ready) { this.update(dt); this.draw(); }
      this.frame = this.window.requestAnimationFrame(tick);
    };
    this.frame = this.window.requestAnimationFrame(tick);
  }
  loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new this.window.Image(); this.images ??= []; this.images.push(image);
      image.onload = () => image.naturalWidth > 0 ? resolve(image) : reject(new Error('图片尺寸无效'));
      image.onerror = () => reject(new Error('绘画素材未能载入，请返回云图后重试。'));
      image.src = new URL(source, import.meta.url).href;
    });
  }
  fail(message) { if (!this.disposed && !this.failed) { this.failed = true; this.callbacks.onReady?.({ ok: false, sceneReady: false, message }); } }
  trimSprites() {
    if (!this.document.createElement) return null;
    const sheet = this.document.createElement('canvas'); sheet.width = this.figures.naturalWidth; sheet.height = this.figures.naturalHeight;
    const ctx = sheet.getContext('2d', { willReadFrequently: true }); ctx.drawImage(this.figures, 0, 0);
    const { data } = ctx.getImageData(0, 0, sheet.width, sheet.height), sw = sheet.width / 4, sh = sheet.height / 2;
    // A shared crop across each row keeps the foot baseline and scale stable through every pose.
    return [0, 1].map(row => {
      let left = sw, top = sh, right = 0, bottom = 0;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sheet.width; x++) {
        if (data[((y + row * sh) * sheet.width + x) * 4 + 3] > 24) {
          const localX = x % sw; left = Math.min(left, localX); right = Math.max(right, localX); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      return right > left ? { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } : { x: 0, y: 0, width: sw, height: sh };
    });
  }
  listen(target, type, fn) { target.addEventListener(type, fn); this.removers.push(() => target.removeEventListener(type, fn)); }
  bindInput() {
    const clear = () => { this.keys.clear(); this.input = { x: 0, z: 0, run: false }; this.state.destination = null; this.approachNpc = false; this.pointer = null; };
    this.clearInput = clear;
    this.listen(this.window, 'keydown', event => {
      if (event.metaKey || event.ctrlKey || event.altKey || /^(Meta|Alt|Control)/.test(event.code)) { clear(); return; }
      if (this.paused || event.isComposing || event.target?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
      if (![...RIGHT, ...LEFT, 'ShiftLeft', 'ShiftRight', 'Space'].includes(event.code)) return;
      event.preventDefault(); this.keys.add(event.code);
      if (event.code === 'Space' && !event.repeat) this.requestJump();
    });
    this.listen(this.window, 'keyup', event => this.keys.delete(event.code));
    this.listen(this.window, 'resize', () => this.resize());
    this.listen(this.window, 'blur', clear);
    this.listen(this.document, 'visibilitychange', clear);
    this.listen(this.canvas, 'pointerdown', event => {
      if (this.paused || event.button !== 0 || event.isPrimary === false) return;
      this.canvas.focus(); this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this.listen(this.canvas, 'pointermove', event => {
      if (this.pointer?.id === event.pointerId && Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 8) this.pointer.dragged = true;
    });
    this.listen(this.canvas, 'pointerup', event => {
      const pointer = this.pointer; if (pointer?.id !== event.pointerId) return;
      this.pointer = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
      if (this.paused || pointer.dragged) return;
      const rect = this.canvas.getBoundingClientRect(), layout = this.layout();
      let target = clamp((event.clientX - rect.left + layout.camera) / layout.worldWidth, .08, .92);
      this.approachNpc = Math.abs(target - this.state.npc) < .035;
      if (this.approachNpc) target = this.state.npc + (this.state.u < this.state.npc ? -.045 : .045);
      this.state.destination = target; this.draw();
    });
    for (const name of ['pointercancel', 'lostpointercapture']) this.listen(this.canvas, name, () => { this.pointer = null; });
  }
  layout() {
    const ground = this.art?.ground ?? .79, floor = this.height * (this.art?.floor ?? .79);
    // Align the real path in each painting, covering both edges on any viewport.
    const worldHeight = Math.max(this.width / 1.5, this.height, floor / ground, (this.height - floor) / (1 - ground));
    const worldWidth = worldHeight * 1.5, top = floor - worldHeight * ground;
    const camera = clamp(this.state.u * worldWidth - this.width * .43, 0, worldWidth - this.width);
    return { worldWidth, worldHeight, floor, top, camera };
  }
  resize() {
    this.width = this.canvas.clientWidth || this.window.innerWidth || 800; this.height = this.canvas.clientHeight || this.window.innerHeight || 600;
    this.dpr = Math.min(this.window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.draw();
  }
  startChapter(id) {
    const chapter = CHAPTERS.find(item => item.id === id), art = PAINTED_CHAPTERS[id];
    if (!chapter || !art) throw new Error(`Unknown painted chapter: ${id}`);
    if (!this.ctx || this.disposed) return;
    const generation = ++this.generation;
    this.chapter = chapter; this.art = art; this.ready = false; this.failed = false; this.setPaused(true); this.reset();
    this.cases = Object.entries(chapter.encounters).map(([caseId, lines]) => ({ id: caseId, label: lines[0] }));
    this.canvas.setAttribute?.('aria-label', `${chapter.realm} · ${art.style}绘画探索，点击地面行走，靠近${chapter.host}交谈`);
    // Clear the previous painting while the new one loads; never present stale art as ready.
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pendingLoad = Promise.all([this.common, this.loadImage(art.background), art.guardian === undefined ? null : this.loadImage('./assets/painted/four-kings-cutout.png')]).then(([, landscape, guardians]) => {
      if (this.disposed || generation !== this.generation) return;
      if (this.commonError) throw this.commonError;
      this.landscape = landscape; this.guardians = guardians;
      this.guardianBounds = guardians ? this.trimGuardian(guardians, art.guardian) : null;
      this.ready = true; this.lastTime = undefined; this.draw(); this.callbacks.onReady?.({ ok: true, chapter: id });
    }).catch(error => { if (generation === this.generation) this.fail(error.message); });
  }
  trimGuardian(image, index) {
    const sw = image.naturalWidth / 2, sh = image.naturalHeight / 2;
    const cell = { x: index % 2 * sw, y: Math.floor(index / 2) * sh, width: sw, height: sh };
    if (!this.document.createElement) return cell;
    const sheet = this.document.createElement('canvas'); sheet.width = sw; sheet.height = sh;
    const ctx = sheet.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, cell.x, cell.y, sw, sh, 0, 0, sw, sh);
    const { data } = ctx.getImageData(0, 0, sw, sh); let left = sw, top = sh, right = 0, bottom = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (data[(y * sw + x) * 4 + 3] > 24) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    return right > left ? { x: cell.x + left, y: cell.y + top, width: right - left + 1, height: bottom - top + 1 } : cell;
  }
  reset() { this.clearInput?.(); this.state = createInkState(); this.pendingEncounter = false; this.near = null; this.callbacks.onNear?.(null); this.draw(); }
  setPaused(value) {
    const wasPaused = this.paused; this.paused = !!value;
    if (this.paused) this.clearInput?.();
    else if (wasPaused && this.pendingEncounter) { this.state.caseIndex = (this.state.caseIndex + 1) % this.cases.length; this.pendingEncounter = false; }
    this.lastTime = undefined; this.draw();
  }
  setView() {}
  setSensitivity() {}
  setMoveInput(x, z, run = false) { if (!this.paused) this.input = { x: Number(x) || 0, z: Number(z) || 0, run: !!run }; }
  requestJump() { if (!this.paused && this.ready && !this.state.height && !this.state.velocity) this.state.velocity = .78; }
  interact() {
    if (this.paused || !this.ready || this.pendingEncounter || Math.abs(this.state.u - this.state.npc) > .065) return;
    this.state.destination = null; this.approachNpc = false; this.pendingEncounter = true; this.near = null; this.callbacks.onNear?.(null);
    this.callbacks.onInteract?.({ ...this.cases[this.state.caseIndex] });
  }
  update(dt) {
    const keyboard = Number(RIGHT.some(key => this.keys.has(key))) - Number(LEFT.some(key => this.keys.has(key)));
    const axis = keyboard || this.input.x - this.input.z;
    if (axis) this.approachNpc = false;
    if (this.approachNpc) {
      if (Math.abs(this.state.u - this.state.npc) <= .055) { this.approachNpc = false; this.state.destination = null; }
      else this.state.destination = this.state.npc + (this.state.u < this.state.npc ? -.045 : .045);
    }
    advanceInkState(this.state, dt, { paused: this.paused, axis, run: this.input.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'), reducedMotion: this.reducedMotion });
    const near = !this.pendingEncounter && Math.abs(this.state.u - this.state.npc) <= .065 ? this.cases[this.state.caseIndex] : null;
    if (near?.id !== this.near?.id) { this.near = near; this.callbacks.onNear?.(near ? { ...near } : null); }
  }
  draw() {
    if (!this.ctx || !this.ready || this.disposed) return;
    const c = this.ctx, s = this.state, l = this.layout(), h = this.height, w = this.width;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, w, h);
    c.drawImage(this.landscape, -l.camera, l.top, l.worldWidth, l.worldHeight);
    if (!this.reducedMotion) this.drawWeather(c, s.time, w, h);
    const sprite = (u, row, moving, distance, direction, jump = 0) => {
      const x = u * l.worldWidth - l.camera, size = h * .19;
      c.save(); c.translate(x, l.floor); c.fillStyle = 'rgba(31,47,39,.22)'; c.beginPath(); c.ellipse(0, 0, size * .19, size * .035, 0, 0, Math.PI * 2); c.fill();
      c.translate(0, -jump * h); c.scale(direction, 1);
      const sw = this.figures.naturalWidth / 4, sh = this.figures.naturalHeight / 2, frame = moving ? 1 + Math.floor(distance / .009) % 3 : 0;
      const crop = this.spriteBounds?.[row] || { x: 0, y: 0, width: sw, height: sh }, width = size * crop.width / crop.height;
      c.drawImage(this.figures, frame * sw + crop.x, row * sh + crop.y, crop.width, crop.height, -width / 2, -size, width, size); c.restore();
    };
    if (this.guardians) {
      const crop = this.guardianBounds, size = h * .32, width = size * crop.width / crop.height;
      const x = s.npc * l.worldWidth - l.camera, hover = this.reducedMotion ? 0 : Math.sin(s.time * 1.7) * h * .004;
      c.save(); c.translate(x, l.floor + hover);
      c.fillStyle = this.art.light ? 'rgba(250,246,222,.7)' : 'rgba(206,200,177,.45)';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(i * size * .12, -2 - Math.abs(i) * 3, size * .18, size * .035, 0, 0, Math.PI * 2); c.fill(); }
      c.drawImage(this.guardians, crop.x, crop.y, crop.width, crop.height, -width / 2, -size - 5, width, size); c.restore();
    } else sprite(s.npc, 1, s.npcMoving, s.npcDistance, s.npcMoving ? s.npcDirection : Math.sign(s.u - s.npc) || 1);
    sprite(s.u, 0, s.moving, s.distance, s.direction, s.height);
    if (s.destination !== null) {
      const x = s.destination * l.worldWidth - l.camera;
      c.strokeStyle = 'rgba(245,226,177,.85)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, l.floor, 6, 2.4, -.1, .15, Math.PI * 1.9); c.stroke();
    }
    const nx = s.npc * l.worldWidth - l.camera;
    c.textAlign = 'center'; c.font = `${Math.max(12, Math.min(16, h * .022))}px "Songti SC", serif`;
    c.shadowColor = this.art.light ? 'rgba(245,245,225,.95)' : 'rgba(12,20,25,.95)'; c.shadowBlur = 7;
    c.fillStyle = this.art.light ? '#273f3a' : '#f4e5bd';
    c.fillText(`${this.chapter.host} · ${this.chapter.name}`, nx, l.floor - h * (this.guardians ? .36 : .23)); c.shadowBlur = 0;
  }
  drawWeather(c, time, w, h) {
    const weather = this.art.weather;
    if (weather === 'rain' || weather === 'storm') {
      const storm = weather === 'storm'; c.strokeStyle = storm ? 'rgba(220,232,239,.29)' : 'rgba(239,243,231,.18)'; c.lineWidth = storm ? 1 : .7; c.beginPath();
      for (let i = 0; i < (storm ? 95 : 65); i++) {
        const x = ((i * 193.7 - time * (storm ? 110 : 17)) % (w + 80) + w + 80) % (w + 80), y = (i * 89.3 + time * (storm ? 390 : 210)) % h;
        c.moveTo(x, y); c.lineTo(x - (storm ? 18 : 3), y + (storm ? 26 : 15));
      }
      c.stroke(); return;
    }
    const colors = { snow: 'rgba(255,255,249,.75)', petals: 'rgba(241,179,178,.65)', sand: 'rgba(231,194,119,.35)', motes: 'rgba(245,210,139,.5)', bubbles: 'rgba(213,249,243,.45)' };
    c.fillStyle = colors[weather]; c.strokeStyle = colors[weather]; c.lineWidth = .8;
    for (let i = 0; i < 28; i++) {
      const rising = weather === 'bubbles' || weather === 'motes', speed = weather === 'sand' ? 38 : 9;
      const x = (i * 173.7 + Math.sin(time * .4 + i) * 12 + time * speed) % (w + 10);
      const y = ((i * 89.3 + time * (rising ? -13 : 19)) % h + h) % h, radius = weather === 'petals' ? 2.6 : 1 + i % 3 * .6;
      c.beginPath(); c.ellipse(x, y, radius, weather === 'petals' ? 1 : radius, time * .3, 0, Math.PI * 2);
      if (weather === 'bubbles') c.stroke(); else c.fill();
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.window.cancelAnimationFrame(this.frame); this.removers.forEach(remove => remove());
    for (const image of this.images || []) image.onload = image.onerror = null;
    this.clearInput?.(); this.callbacks.onNear?.(null);
  }
}

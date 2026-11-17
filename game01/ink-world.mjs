import { CHAPTERS } from './journey.mjs';
import { PAINTED_CHAPTERS } from './painted-chapters.mjs';
import { REGION_IDS, createScrollState, advanceScrollState, regionAt, nearestNpc, npcEncounter, beginCloud } from './scroll-world.mjs';

// Playable paintings: positions are fractions of each horizontal path.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const RIGHT = ['KeyD', 'KeyW', 'ArrowRight', 'ArrowUp'];
const LEFT = ['KeyA', 'KeyS', 'ArrowLeft', 'ArrowDown'];
const TRANSITION_WIDTH = .18;
export function transitionOpacity(progress) { const t = clamp(progress,0,1); return t * t * (3 - 2 * t); }
export function sceneBlend(u) {
  const boundary = Math.round(u);
  if (boundary > 0 && boundary < REGION_IDS.length && Math.abs(u - boundary) < TRANSITION_WIDTH) {
    const opacity = transitionOpacity((u - boundary + TRANSITION_WIDTH) / (TRANSITION_WIDTH * 2));
    return [{ index: boundary - 1,opacity: 1 - opacity },{ index: boundary,opacity }];
  }
  return [{ index: regionAt(u),opacity: 1 }];
}
export function createInkState() {
  return createScrollState();
}
export function advanceInkState(state, dt, { paused = false, axis = 0, run = false, reducedMotion = false } = {}) {
  return advanceScrollState(state, dt, { paused, axis, run, reducedMotion });
}

export class InkWorld {
  constructor(canvas, { onReady, onNear, onInteract, onRegion, reducedMotion = false, seed } = {}) {
    this.canvas = canvas; this.callbacks = { onReady, onNear, onInteract, onRegion }; this.reducedMotion = reducedMotion; this.seed = seed;
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
      if (this.state.flight) return;
      const localX = (event.clientX - rect.left) * this.width / (rect.width || this.width);
      let target = clamp((localX + layout.camera) / layout.segmentWidth, .035, REGION_IDS.length - .035);
      const npc = this.state.npcs.find(item => Math.abs(target - item.u) < .025);
      this.approachNpc = npc?.key || false;
      if (npc) target = npc.u + (this.state.u < npc.u ? -.045 : .045);
      this.state.destination = target; this.draw();
    });
    for (const name of ['pointercancel', 'lostpointercapture']) this.listen(this.canvas, name, () => { this.pointer = null; });
  }
  layout() {
    const ground = this.art?.ground ?? .79, floor = this.height * (this.art?.floor ?? .79);
    // Align the real path in each painting, covering both edges on any viewport.
    const segmentWidth = Math.max(this.width * 1.15, this.height * 1.5);
    const worldHeight = Math.max(segmentWidth / 1.5, this.height, floor / ground, (this.height - floor) / (1 - ground));
    const worldWidth = segmentWidth * REGION_IDS.length, top = floor - worldHeight * ground;
    const target = clamp(this.state.u * segmentWidth - this.width * .43, 0, worldWidth - this.width);
    return { worldWidth, segmentWidth, worldHeight, floor, top, camera: this.camera ?? target, target };
  }
  resize() {
    this.width = this.canvas.clientWidth || this.window.innerWidth || 800; this.height = this.canvas.clientHeight || this.window.innerHeight || 600;
    this.dpr = Math.min(this.window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.panels = null; this.camera = undefined; this.draw();
  }
  startChapter(id) { return this.startJourney(id); }
  startJourney(id = 'nantian') {
    const chapter = CHAPTERS.find(item => item.id === id), art = PAINTED_CHAPTERS[id];
    if (!chapter || !art) throw new Error(`Unknown painted chapter: ${id}`);
    if (!this.ctx || this.disposed) return;
    if (this.pendingLoad) return this.pendingLoad;
    const generation = ++this.generation;
    this.chapter = chapter; this.art = art; this.ready = false; this.failed = false; this.setPaused(true); this.state = createScrollState(this.seed, id);
    this.cases = Object.entries(chapter.encounters).map(([caseId, lines]) => ({ id: caseId, label: lines[0] }));
    this.updateAccessibleLabel();
    // Clear the previous painting while the new one loads; never present stale art as ready.
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pendingLoad = Promise.all([this.common, ...REGION_IDS.map(region => this.loadImage(PAINTED_CHAPTERS[region].background)), this.loadImage('./assets/painted/four-kings-cutout.png'), this.loadImage('./assets/painted/scroll-visitors-v1.png')]).then(([, ...images]) => {
      if (this.disposed || generation !== this.generation) return;
      if (this.commonError) throw this.commonError;
      this.landscapes = images.slice(0, 8); this.guardians = images[8]; this.visitors = images[9];
      this.kingCrops = [0,1,2,3].map(index => this.trimGuardian(this.guardians,index));
      this.visitorCrops = Array.from({ length: 8 }, (_, index) => this.trimGuardian(this.visitors,index,4,2));
      this.ready = true; this.lastTime = undefined; this.draw(); this.callbacks.onReady?.({ ok: true, chapter: id }); this.callbacks.onRegion?.({ chapter: id });
    }).catch(error => { if (generation === this.generation) this.fail(error.message); });
  }
  trimGuardian(image, index, columns = 2, rows = 2) {
    const sw = image.naturalWidth / columns, sh = image.naturalHeight / rows;
    const cell = { x: index % columns * sw, y: Math.floor(index / columns) * sh, width: sw, height: sh };
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
  reset() { this.clearInput?.(); this.state = createScrollState(this.state.seed); this.camera = undefined; this.pendingEncounter = false; this.near = null; this.callbacks.onNear?.(null); this.draw(); }
  setPaused(value) {
    const wasPaused = this.paused; this.paused = !!value;
    if (this.paused) this.clearInput?.();
    else if (wasPaused && this.pendingEncounter) { const npc = this.state.npcs.find(item => item.key === this.pendingEncounter); if (npc) npc.caseIndex = (npc.caseIndex + 1) % Object.keys(CHAPTERS.find(item => item.id === npc.chapter).encounters).length; this.pendingEncounter = false; }
    this.lastTime = undefined; this.draw();
  }
  setView() {}
  setSensitivity() {}
  updateAccessibleLabel() { this.canvas.setAttribute?.('aria-label', `${this.chapter.realm} · ${this.art.style}连续长卷探索，点击地面行走，靠近来客交谈，空格跳跃，可驾筋斗云往来各境`); }
  setMoveInput(x, z, run = false) { if (!this.paused) this.input = { x: Number(x) || 0, z: Number(z) || 0, run: !!run }; }
  requestJump() { if (!this.paused && this.ready && !this.state.flight && !this.state.height && !this.state.velocity) this.state.velocity = .78; }
  castCloud(chapter) {
    if (this.paused || !this.ready || !beginCloud(this.state, chapter)) return false;
    this.clearInput(); this.near = null; this.callbacks.onNear?.(null); return true;
  }
  castFreeze() { if (this.paused || !this.ready) return false; this.state.freeze = 5; return true; }
  interact() {
    const npc = nearestNpc(this.state);
    if (this.paused || !this.ready || this.pendingEncounter || this.state.flight || !npc) return;
    this.state.destination = null; this.approachNpc = false; this.pendingEncounter = npc.key; this.near = null; this.callbacks.onNear?.(null);
    this.callbacks.onInteract?.(npcEncounter(npc));
  }
  update(dt) {
    const keyboard = Number(RIGHT.some(key => this.keys.has(key))) - Number(LEFT.some(key => this.keys.has(key)));
    const axis = keyboard || this.input.x - this.input.z;
    if (axis) this.approachNpc = false;
    if (this.approachNpc) {
      const npc = this.state.npcs.find(item => item.key === this.approachNpc);
      if (!npc || Math.abs(this.state.u - npc.u) <= .055) { this.approachNpc = false; this.state.destination = null; }
      else this.state.destination = npc.u + (this.state.u < npc.u ? -.045 : .045);
    }
    advanceInkState(this.state, dt, { paused: this.paused, axis, run: this.input.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'), reducedMotion: this.reducedMotion });
    const chapter = CHAPTERS[regionAt(this.state.u)];
    if (chapter.id !== this.chapter.id) { this.chapter = chapter; this.art = PAINTED_CHAPTERS[chapter.id]; this.updateAccessibleLabel(); this.callbacks.onRegion?.({ chapter: chapter.id }); }
    const l = this.layout(), cameraSpeed = this.state.flight ? 24 : 7;
    this.camera = this.reducedMotion || this.camera === undefined ? l.target : this.camera + (l.target - this.camera) * (1 - Math.exp(-Math.min(dt,.05) * cameraSpeed));
    const npc = !this.pendingEncounter && !this.state.flight ? nearestNpc(this.state) : null, near = npc ? npcEncounter(npc) : null;
    if (near?.npcId !== this.near?.npcId || near?.id !== this.near?.id) { this.near = near; this.callbacks.onNear?.(near); }
  }
  draw() {
    if (!this.ctx || !this.ready || this.disposed) return;
    const c = this.ctx, s = this.state, l = this.layout(), h = this.height, w = this.width;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, w, h);
    this.drawPanorama(c,l);
    if (!this.reducedMotion) for (const layer of sceneBlend(s.u)) {
      c.save(); c.globalAlpha = layer.opacity;
      this.drawWeather(c, s.time, w, h, PAINTED_CHAPTERS[REGION_IDS[layer.index]].weather); c.restore();
    }
    const sprite = (u, row, moving, distance, direction, jump = 0) => {
      const x = u * l.segmentWidth - l.camera, size = h * .15;
      c.save(); c.translate(x, l.floor); c.fillStyle = 'rgba(31,47,39,.22)'; c.beginPath(); c.ellipse(0, 0, size * .19, size * .035, 0, 0, Math.PI * 2); c.fill();
      c.translate(0, -jump * h); c.scale(direction, 1);
      const sw = this.figures.naturalWidth / 4, sh = this.figures.naturalHeight / 2, frame = moving ? 1 + Math.floor(distance / .009) % 3 : 0;
      const crop = this.spriteBounds?.[row] || { x: 0, y: 0, width: sw, height: sh }, width = size * crop.width / crop.height;
      c.drawImage(this.figures, frame * sw + crop.x, row * sh + crop.y, crop.width, crop.height, -width / 2, -size, width, size); c.restore();
    };
    for (const npc of s.npcs) {
      const x = npc.u * l.segmentWidth - l.camera;
      if (x < -100 || x > w + 100) continue;
      const king = npc.king !== undefined, crop = king ? this.kingCrops[npc.king] : this.visitorCrops[npc.cell], image = king ? this.guardians : this.visitors;
      const size = h * (king ? .2 : .14), width = size * crop.width / crop.height;
      const bob = npc.moving && !this.reducedMotion ? Math.sin(npc.distance * 650) * 1.4 : 0;
      c.save(); c.translate(x,l.floor + bob); c.fillStyle = 'rgba(31,47,39,.2)'; c.beginPath(); c.ellipse(0,0,size * .18,size * .025,0,0,Math.PI * 2); c.fill();
      c.scale(npc.moving ? npc.direction : Math.sign(s.u - npc.u) || 1,1); c.drawImage(image,crop.x,crop.y,crop.width,crop.height,-width / 2,-size,width,size); c.restore();
      if (this.near?.npcId === npc.key) {
        c.textAlign = 'center'; c.font = `${Math.max(12,Math.min(16,h * .019))}px "Songti SC", serif`; c.shadowColor = '#fff4d8'; c.shadowBlur = 8; c.fillStyle = '#283a34';
        c.fillText(`${npc.speaker} · 可交谈`,x,l.floor - size - 15); c.shadowBlur = 0;
      }
    }
    if (s.flight) {
      const x = s.u * l.segmentWidth - l.camera;
      c.save(); c.translate(x,l.floor - s.height * h - 1); c.fillStyle = 'rgba(255,242,208,.92)';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(i * 13,-Math.abs(i) * 2,23,8,0,0,Math.PI * 2); c.fill(); } c.restore();
    }
    sprite(s.u, 0, s.moving && !s.flight, s.distance, s.direction, s.height);
    if (s.destination !== null) {
      const x = s.destination * l.segmentWidth - l.camera;
      c.strokeStyle = 'rgba(245,226,177,.85)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, l.floor, 6, 2.4, -.1, .15, Math.PI * 1.9); c.stroke();
    }
  }
  drawPanorama(c,l) {
    // The outgoing painting stays opaque; only the incoming edge fades over it.
    // Complementary source-over weights avoid the pale dip caused by two fading edges.
    const overlap = l.segmentWidth * TRANSITION_WIDTH;
    if (!this.panels && this.document.createElement) {
      this.panels = this.landscapes.map((image,index) => {
        const panel = this.document.createElement('canvas'); panel.width = Math.ceil(l.segmentWidth + overlap * 2); panel.height = this.height;
        const p = panel.getContext('2d'), art = PAINTED_CHAPTERS[REGION_IDS[index]], ground = art.ground;
        const height = Math.max(panel.width / 1.5,this.height,l.floor / ground,(this.height - l.floor) / (1 - ground));
        p.drawImage(image,(panel.width - height * 1.5) / 2,l.floor - height * ground,height * 1.5,height);
        const fade = p.createLinearGradient(0,0,panel.width,0);
        for (let step = 0; step <= 8; step++) {
          const progress = step / 8, alpha = index ? transitionOpacity(progress) : 1;
          fade.addColorStop(progress * overlap * 2 / panel.width,`rgba(0,0,0,${alpha})`);
        }
        fade.addColorStop(1,'rgba(0,0,0,1)');
        p.globalCompositeOperation = 'destination-in'; p.fillStyle = fade; p.fillRect(0,0,panel.width,panel.height); return panel;
      });
    }
    this.landscapes.forEach((image,index) => {
      const x = index * l.segmentWidth - l.camera;
      if (x > this.width + overlap || x + l.segmentWidth < -overlap) return;
      if (this.panels) c.drawImage(this.panels[index],x - overlap,0);
      else { const art = PAINTED_CHAPTERS[REGION_IDS[index]], height = Math.max(l.segmentWidth / 1.5,this.height,l.floor / art.ground,(this.height - l.floor) / (1 - art.ground)); c.drawImage(image,x,l.floor - height * art.ground,l.segmentWidth,height); }
    });
    // A quiet continuous towpath crosses every realm rather than ending at scene borders.
    const path = c.createLinearGradient?.(0,l.floor - 3,0,l.floor + 20);
    if (path?.addColorStop) { path.addColorStop(0,'rgba(220,207,171,0)'); path.addColorStop(.4,'rgba(220,207,171,.24)'); path.addColorStop(1,'rgba(220,207,171,0)'); c.fillStyle = path; c.fillRect(0,l.floor - 3,this.width,23); }
  }
  drawWeather(c, time, w, h, weather = this.art.weather) {
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

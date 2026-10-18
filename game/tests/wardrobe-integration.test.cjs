const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const THREE = require("three");

const gameDirectory = path.resolve(__dirname, "..");
const gameFilename = path.join(gameDirectory, "game.js");

class Element {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.open = false;
    this.disabled = false;
    this.hidden = false;
    this.textContent = "";
    this._html = "";
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, enabled = !classes.has(name)) => { if (enabled) classes.add(name); else classes.delete(name); }
    };
    this.style = { setProperty() {} };
  }
  set innerHTML(value) { this._html = value; this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  click() { if (!this.disabled) this.listeners.get("click")?.({ target: this, preventDefault() {} }); }
  querySelectorAll(selector) {
    const result = [];
    const visit = (item) => {
      item.children.forEach((child) => {
        if (selector === "button" && child.tagName === "BUTTON") result.push(child);
        visit(child);
      });
    };
    visit(this);
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || new Element(); }
}

function productionAPI(dependencies = {}, storage = {}) {
  const elementsById = new Map();
  const document = {
    getElementById(id) {
      if (!elementsById.has(id)) { const element = new Element(); element.ownerDocument = document; elementsById.set(id, element); }
      return elementsById.get(id);
    },
    createElement: (tagName) => new Element(tagName),
    querySelectorAll: () => [],
    body: { dataset: {} }
  };
  const writes = [];
  const localStorage = {
    getItem: storage.getItem || (() => null),
    setItem: storage.setItem || ((key, value) => writes.push({ key, value }))
  };
  const context = vm.createContext({
    THREE, ...dependencies, performance, console, document, localStorage,
    continents: ["asia", "europe", "africa", "north-america", "south-america", "oceania", "antarctica"].map((id, index) => ({ id, label: ["亚洲", "欧洲", "非洲", "北美洲", "南美洲", "大洋洲", "南极洲"][index] })),
    window: { matchMedia: () => ({ matches: false }), setTimeout: () => 1, innerWidth: 1280, innerHeight: 720, localStorage },
    clearTimeout() {}, surfaceTexture: () => null
  });
  let original = fs.readFileSync(gameFilename, "utf8");
  const characterCallback = original.match(/loadAgentCharacter\(\)\.then\(\(character\) => \{([\s\S]*?)\n\s*\}\)\.catch/);
  const wheelListener = original.match(/elements\.worldCanvas\.addEventListener\("wheel",[\s\S]*?\}, \{ passive: false \}\);/);
  assert.ok(wheelListener, "The actual production zoom listener must be registered");
  let source = original.replace(/^import .*;\r?\n/gm, "\n");
  const startup = source.indexOf('elements.start.addEventListener("click"');
  assert.ok(startup > 0, "Production browser startup boundary must be found");
  source = source.slice(0, startup);
  source += `\n${wheelListener[0]}\n`;
  source += `
globalThis.wardrobeIntegration = {
  readWardrobeSave: typeof readWardrobeSave === "function" ? readWardrobeSave : undefined,
  saveWardrobe: typeof saveWardrobe === "function" ? saveWardrobe : undefined,
  applyEquippedOutfit: typeof applyEquippedOutfit === "function" ? applyEquippedOutfit : undefined,
  updateWardrobeStatus: typeof updateWardrobeStatus === "function" ? updateWardrobeStatus : undefined,
  gainExperience: typeof gainExperience === "function" ? gainExperience : undefined,
  openWardrobe: typeof openWardrobe === "function" ? openWardrobe : undefined,
  hasOpenDialog: typeof hasOpenDialog === "function" ? hasOpenDialog : undefined,
  renderWardrobe: typeof renderWardrobe === "function" ? renderWardrobe : undefined,
  previewClothing: typeof previewClothing === "function" ? previewClothing : undefined,
  finishClothingPreview: typeof finishClothingPreview === "function" ? finishClothingPreview : undefined,
  collectNearbyDiscoveries, answerEncounter, jump, callGuide, moveFromPointer, interact, update,
  state, elements, locations, PortWorld,
  setContext(values) {
    if ("progress" in values) wardrobeProgress = values.progress;
    if ("region" in values) currentRegion = values.region;
    if ("stage" in values) stage = values.stage;
    if ("pointer" in values) canvasPointerStart = values.pointer;
  },
  getProgress() { return typeof wardrobeProgress === "undefined" ? undefined : wardrobeProgress; },
  storageAvailable() { return typeof wardrobeStorageAvailable === "undefined" ? undefined : wardrobeStorageAvailable; },
  pointer() { return typeof canvasPointerStart === "undefined" ? undefined : canvasPointerStart; },
  finishModelLoad(character) { ${characterCallback?.[1] || "throw new Error('Production model callback missing');"} }
};`;
  vm.runInContext(source, context, { filename: gameFilename, timeout: 5000 });
  return { api: context.wardrobeIntegration, context, elementsById, writes };
}

async function wardrobeDependencies() {
  const filename = path.join(gameDirectory, "wardrobe.js");
  if (!fs.existsSync(filename)) return {};
  return import(`${pathToFileURL(filename).href}?integration=${fs.statSync(filename).mtimeMs}`);
}

async function integration(storage) {
  const dependencies = await wardrobeDependencies();
  const harness = productionAPI(dependencies, storage);
  for (const name of ["readWardrobeSave", "saveWardrobe", "applyEquippedOutfit", "updateWardrobeStatus", "gainExperience", "openWardrobe", "hasOpenDialog", "renderWardrobe"]) {
    assert.equal(typeof harness.api[name], "function", `Production ${name} has not been implemented`);
  }
  return { ...harness, dependencies };
}

test("wardrobe production integration exposes its persistence, progression and modal APIs", async () => {
  await integration();
});

test("real discovery and interaction callbacks award and persist unique experience", async () => {
  const { api, dependencies, writes } = await integration();
  const progress = dependencies.createWardrobeProgress();
  const applied = [];
  api.setContext({ progress, stage: { agentCharacter: { setOutfit: (outfit) => applied.push(outfit.id) }, collectibles: new Map() } });
  const office = api.locations.find((item) => item.id === "office");
  const object = { visible: true };
  api.setContext({ stage: { agentCharacter: { setOutfit: (outfit) => applied.push(outfit.id) }, collectibles: new Map([["office", { location: office, object, x: -8.1, z: -4.2 }]]) } });
  api.collectNearbyDiscoveries();
  assert.equal(dependencies.wardrobeXP(progress), 2);
  assert.equal(object.visible, false);
  api.state.activeEncounter = { location: office, encounter: { choices: [["选择", "结果", 3, 8]] } };
  api.answerEncounter(0);
  api.answerEncounter(0);
  assert.equal(dependencies.wardrobeXP(progress), 5);
  assert.ok(writes.length >= 2);
  assert.equal(JSON.parse(writes.at(-1).value).discoveries[0], "asia:office");
  assert.equal(applied.at(-1), "basic");
});

test("growth upgrades apply immediately and the async model uses the latest outfit", async () => {
  const { api, dependencies } = await integration();
  const progress = dependencies.createWardrobeProgress();
  const applied = [];
  const stage = { agentCharacter: { setOutfit: (outfit) => applied.push(outfit.id) }, player: { add() {}, userData: { rig: {} } } };
  api.setContext({ progress, stage });
  for (const id of ["office", "airport", "immigration", "customs", "msa", "shipyard"]) api.gainExperience("discovery", id);
  assert.equal(progress.equipped, "voyager");
  assert.equal(applied.at(-1), "voyager");
  assert.match(api.elements.wardrobeButton.textContent, /Lv.?2/);
  dependencies.equipOutfit(progress, "basic");
  api.finishModelLoad({ object: {}, setOutfit: (outfit) => applied.push(outfit.id) });
  assert.equal(applied.at(-1), "basic");
  assert.equal(api.elements.worldCanvas.dataset.outfit, "basic");
});

test("blocked storage and malformed JSON do not prevent dressing or exploration", async () => {
  const { api, dependencies } = await integration({ getItem() { return "not json"; }, setItem() { throw new Error("Storage blocked"); } });
  assert.equal(api.readWardrobeSave(), undefined);
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage: { agentCharacter: { setOutfit() {} } } });
  assert.doesNotThrow(() => api.gainExperience("discovery", "office"));
  assert.equal(api.storageAvailable(), false);
  assert.equal(dependencies.wardrobeXP(api.getProgress()), 2);
});

test("opening the wardrobe pauses held inputs and guards game actions", async () => {
  const { api, dependencies } = await integration();
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage: {}, pointer: { x: 10 } });
  api.state.mode = "play";
  api.state.keys.add("KeyW"); api.state.holds.up = true; api.state.velocity.set(1, 0, 1);
  api.openWardrobe();
  assert.equal(api.hasOpenDialog(), true);
  assert.equal(api.state.keys.size, 0);
  assert.equal(api.state.holds.up, false);
  assert.equal(api.state.velocity.length(), 0);
  assert.equal(api.pointer(), null);
  for (const action of [() => api.jump(), () => api.callGuide(), () => api.moveFromPointer(10, 10), () => api.interact(), () => api.update(.05)]) assert.doesNotThrow(action);
  assert.equal(api.state.grounded, true);
});

test("wardrobe cards disable locked clothes and equip unlocked clothes with a saved selection", async () => {
  const { api, dependencies, writes } = await integration();
  const progress = dependencies.createWardrobeProgress();
  for (const id of ["office", "airport", "immigration"]) dependencies.recordWardrobeProgress(progress, "discovery", "asia", id);
  dependencies.recordWardrobeProgress(progress, "encounter", "asia", "office");
  const applied = [];
  api.setContext({ progress, stage: { agentCharacter: { setOutfit: (outfit) => applied.push(outfit.id) } } });
  api.renderWardrobe();
  const cards = api.elements.wardrobeList.children;
  assert.equal(cards.length, 10);
  const buttons = api.elements.wardrobeList.querySelectorAll("button");
  const asia = buttons.find((button) => button.dataset.outfit === "asia");
  const master = buttons.find((button) => button.dataset.outfit === "master");
  assert.equal(master.disabled, true);
  asia.click();
  assert.equal(progress.equipped, "asia");
  assert.equal(applied.at(-1), "asia");
  assert.equal(JSON.parse(writes.at(-1).value).equipped, "asia");
});

test("clothing preview shows the actual protagonist from the front without earning XP", async () => {
  const { api, dependencies, writes } = await integration();
  assert.equal(typeof api.previewClothing, "function", "Near-field clothing preview is missing");
  const progress = dependencies.createWardrobeProgress();
  const stage = { cameraYaw: .7, moveMarker: { visible: true } };
  api.setContext({ progress, stage });
  api.state.mode = "play"; api.state.facing = .85;
  api.state.destination = new THREE.Vector3(4, 0, 8);
  api.state.velocity.set(1, 0, 1); api.state.keys.add("KeyW"); api.state.holds.up = true;
  api.elements.wardrobe.open = true;
  api.previewClothing();
  assert.equal(api.elements.wardrobe.open, false);
  assert.equal(api.elements.outfitPreview.hidden, false);
  assert.equal(api.state.cameraMode, "third");
  assert.ok(api.state.cameraDistance <= 4.4);
  assert.ok(Math.abs(stage.cameraYaw - api.state.facing - Math.PI) < 1e-6);
  assert.equal(api.state.destination, null);
  assert.equal(api.state.velocity.length(), 0);
  assert.equal(api.state.keys.size, 0);
  assert.equal(api.state.holds.up, false);
  assert.equal(stage.moveMarker.visible, false);
  assert.match(api.elements.outfitPreviewName.textContent, /初行/);
  assert.doesNotThrow(() => api.update(.05));
  assert.equal(dependencies.wardrobeXP(progress), 0);
  assert.equal(writes.length, 0);
});

test("ending and reopening preview restore the previous view without overwriting it", async () => {
  const { api, dependencies } = await integration();
  assert.equal(typeof api.previewClothing, "function", "Near-field clothing preview is missing");
  assert.equal(typeof api.finishClothingPreview, "function", "Preview camera restoration is missing");
  const stage = { cameraYaw: 1.7, moveMarker: { visible: false } };
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage });
  api.state.mode = "play"; api.state.cameraMode = "first"; api.state.cameraDistance = 17;
  api.state.cameraPitch = .28; api.state.orbitHoldUntil = 1234;
  api.previewClothing(); api.previewClothing();
  api.finishClothingPreview();
  assert.equal(api.state.cameraMode, "first");
  assert.equal(api.state.cameraDistance, 17);
  assert.equal(api.state.cameraPitch, .28);
  assert.equal(stage.cameraYaw, 1.7);
  assert.equal(api.state.orbitHoldUntil, 1234);
  assert.equal(api.elements.outfitPreview.hidden, true);
  assert.equal(api.state.outfitPreview, null);
  assert.doesNotThrow(() => api.finishClothingPreview());
  api.state.mode = "intro"; api.previewClothing();
  assert.equal(api.state.outfitPreview, null);
});

test("calling the guide leaves close-up mode instead of queuing movement behind a frozen preview", async () => {
  const { api, dependencies } = await integration();
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage: { cameraYaw: .7, moveMarker: { visible: false } } });
  api.state.mode = "play"; api.previewClothing();
  api.locations.forEach(({ id }) => api.state.discoveries.add(id));
  api.callGuide();
  assert.equal(api.state.outfitPreview, null);
  assert.equal(api.elements.outfitPreview.hidden, true);
});

test("an actual nearby NPC interaction restores the exploration camera before opening its dialogue", async () => {
  const { api, dependencies } = await integration();
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage: { cameraYaw: .7, moveMarker: { visible: false } } });
  api.state.mode = "play"; api.state.cameraMode = "first"; api.previewClothing();
  api.state.nearbyId = "office"; api.interact();
  assert.equal(api.elements.dialog.open, true);
  assert.equal(api.state.outfitPreview, null);
  assert.equal(api.state.cameraMode, "first");
});

test("preview provides a keyboard exit and restores focus when that exit is hidden", async () => {
  const { api, dependencies, context } = await integration();
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage: { cameraYaw: .7, moveMarker: { visible: false } } });
  api.state.mode = "play"; api.previewClothing();
  assert.ok(api.elements.outfitPreviewClose?.focused, "The visible preview exit needs keyboard focus");
  assert.equal(context.document.activeElement, api.elements.outfitPreviewClose);
  api.finishClothingPreview();
  assert.equal(context.document.activeElement, api.elements.wardrobeButton);
});

test("foreground NPCs do not cover the clothing portrait and recover their original visibility", async () => {
  const { api, dependencies } = await integration();
  const npc = new THREE.Group(), pedestrian = new THREE.Group(), hidden = new THREE.Group();
  hidden.visible = false;
  const stage = { cameraYaw: .7, moveMarker: { visible: false },
    locationGroups: new Map([["office", { npc }], ["customs", { npc: hidden }]]), ambientPeople: [pedestrian] };
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage });
  api.state.mode = "play"; api.previewClothing();
  assert.equal(npc.visible, false, "A roaming NPC can cover the main character in close-up");
  assert.equal(pedestrian.visible, false);
  api.finishClothingPreview();
  assert.equal(npc.visible, true); assert.equal(pedestrian.visible, true); assert.equal(hidden.visible, false);
});

test("clothing inspection has a camera-side fill light that switches off during normal exploration", async () => {
  class Renderer {
    constructor() { this.shadowMap = {}; }
    setPixelRatio() {}
    render() {}
  }
  const dependencies = await wardrobeDependencies();
  const { api } = productionAPI({ ...dependencies, THREE: { ...THREE, WebGLRenderer: Renderer },
    EarthAtlas: class {}, makeSky: () => new THREE.Group(), animateNaturalPerson() {},
    natureUniforms: { time: { value: 0 }, wind: { value: 1 }, player: { value: new THREE.Vector3() } },
    makeNaturalPerson() { const person = new THREE.Group(); person.userData.rig = new THREE.Group(); person.userData.head = new THREE.Group(); return person; }
  });
  class PortraitWorld extends api.PortWorld { setRegion() {} resize() {} }
  const stage = new PortraitWorld();
  assert.ok(stage.portraitLight?.isDirectionalLight, "Shadowed facial features need a soft camera-side fill during inspection");
  assert.equal(stage.portraitLight.castShadow, false, "Do not allocate another shadow-map pass");
  assert.equal(stage.portraitLight.visible, false);
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage, region: { id: "asia", heightScale: 1 } });
  api.state.mode = "play"; api.previewClothing(); stage.render(1, .016);
  assert.equal(stage.portraitLight.visible, true);
  const lightOffset = stage.portraitLight.position.clone().sub(stage.camera.position);
  assert.ok(lightOffset.length() > .6 && lightOffset.length() < 1, "Portrait light should come from the side rather than flatten the face like a camera flash");
  assert.ok(Math.abs(lightOffset.dot(stage.camera.up) - .5) < 1e-6, "The portrait light should remain above the camera on curved terrain");
  const target = stage.portraitLight.target.getWorldPosition(new THREE.Vector3());
  const faceHeight = target.clone().sub(stage.player.getWorldPosition(new THREE.Vector3())).dot(stage.camera.up);
  assert.ok(Math.abs(faceHeight - 1.3) < 1e-6, "The portrait fill should aim at the face rather than the torso");
  api.state.cameraDistance = 1.8; api.state.cameraSnap = true; stage.render(1.01, .016);
  stage.camera.updateMatrixWorld(true);
  const face = stage.player.getWorldPosition(new THREE.Vector3()).addScaledVector(stage.camera.up, 1.44).project(stage.camera);
  assert.ok(Math.abs(face.y) < .35, "Facial inspection must lift the focal point so the face remains near the centre of the view");
  api.finishClothingPreview(); stage.render(1.02, .016);
  assert.equal(stage.portraitLight.visible, false, "Portrait lighting must not change the normal world lighting");
});

test("inspection can zoom in on the face without changing exploration zoom or the saved view", async () => {
  const { api, dependencies } = await integration();
  api.setContext({ progress: dependencies.createWardrobeProgress(), stage: { cameraYaw: .7, moveMarker: { visible: false } } });
  api.state.mode = "play"; api.state.cameraDistance = 11.5;
  const zoom = api.elements.worldCanvas.listeners.get("wheel");
  let prevented = 0;
  const wheel = (deltaY) => zoom({ deltaY, preventDefault() { prevented++; } });
  api.previewClothing();
  for (let step = 0; step < 5; step++) wheel(-1);
  assert.equal(api.state.cameraDistance, 1.8, "The face must be inspectable closer than the full-body view");
  api.finishClothingPreview();
  assert.equal(api.state.cameraDistance, 11.5, "Close-up zoom must not overwrite the saved exploration view");
  for (let step = 0; step < 20; step++) wheel(-1);
  assert.equal(api.state.cameraDistance, 3.4, "Normal exploration must keep its established minimum distance");
  wheel(1);
  assert.equal(api.state.cameraDistance, 4.2);
  api.elements.wardrobe.showModal(); wheel(-1);
  assert.equal(api.state.cameraDistance, 4.2, "An open dialog must still block camera zoom");
  api.elements.wardrobe.close(); api.state.cameraMode = "first"; wheel(-1);
  assert.equal(api.state.cameraDistance, 4.2, "First-person must not change third-person zoom");
  assert.equal(prevented, 26);
});

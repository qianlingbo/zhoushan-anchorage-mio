const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { pathToFileURL, fileURLToPath } = require("node:url");

const localRequire = createRequire(__filename);
const threeRoot = path.dirname(path.dirname(localRequire.resolve("three")));
const THREE = localRequire("three");
const gameDirectory = path.resolve(__dirname, "..");
const moduleURL = pathToFileURL(path.join(threeRoot, "build/three.module.js")).href;
const loaderURL = pathToFileURL(path.join(threeRoot, "examples/jsm/loaders/GLTFLoader.js")).href;
const dataURL = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

// Keep the actual binary mesh, skeleton and animation data. Image decoding is
// unnecessary for CPU geometry checks, and would require a browser canvas.
async function parseGLB(GLTFLoader, filename) {
  const binary = fs.readFileSync(filename);
  const jsonLength = binary.readUInt32LE(12);
  const json = JSON.parse(binary.subarray(20, 20 + jsonLength).toString());
  const buffer = binary.subarray(20 + jsonLength + 8);
  delete json.images;
  delete json.textures;
  delete json.samplers;
  delete json.materials;
  json.meshes.forEach((mesh) => mesh.primitives.forEach((primitive) => { delete primitive.material; }));
  json.buffers[0].uri = `data:application/octet-stream;base64,${buffer.toString("base64")}`;
  return new GLTFLoader().parseAsync(JSON.stringify(json), "");
}

let characterPromise;
function loadCharacter() {
  if (!characterPromise) characterPromise = (async () => {
    const { GLTFLoader } = await import(loaderURL);
    const originalLoad = GLTFLoader.prototype.loadAsync;
    const originalProgress = globalThis.ProgressEvent;
    globalThis.ProgressEvent = class ProgressEvent {
      constructor(type, fields) { this.type = type; Object.assign(this, fields); }
    };
    GLTFLoader.prototype.loadAsync = (url) => parseGLB(GLTFLoader, fileURLToPath(url));
    const filename = path.join(gameDirectory, "character.js");
    const source = fs.readFileSync(filename, "utf8")
      .replace('from "three"', `from "${moduleURL}"`)
      .replace('from "three/addons/loaders/GLTFLoader.js"', `from "${loaderURL}"`)
      .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(filename).href));
    try {
      const { loadAgentCharacter } = await import(dataURL(source));
      return await loadAgentCharacter();
    } finally {
      GLTFLoader.prototype.loadAsync = originalLoad;
      if (originalProgress === undefined) delete globalThis.ProgressEvent;
      else globalThis.ProgressEvent = originalProgress;
    }
  })();
  return characterPromise;
}

// Run the real production function declarations with real Three objects, but
// omit browser event binding/startup. No WebGL renderer or browser is required.
function guideAPI() {
  let source = fs.readFileSync(path.join(gameDirectory, "game.js"), "utf8");
  source = source.replace(/^import .*;\r?\n/gm, "\n");
  const startup = source.indexOf('elements.start.addEventListener("click"');
  assert.ok(startup > 0, "Browser startup boundary must be found");
  source = source.slice(0, startup);
  source += "\nglobalThis.guideAPI = { makeGuideSpirit, animateGuideSpirit: typeof animateGuideSpirit === 'function' ? animateGuideSpirit : undefined };";
  const context = {
    THREE, continents: [{ id: "asia" }], performance,
    document: { getElementById: () => ({}) },
    window: { matchMedia: () => ({ matches: false }) },
    surfaceTexture: () => null
  };
  vm.runInNewContext(source, context, { filename: path.join(gameDirectory, "game.js"), timeout: 5000 });
  return context.guideAPI;
}

function bounds(character) {
  character.object.updateMatrixWorld(true);
  character.object.traverse((part) => { if (part.isSkinnedMesh) part.computeBoundingBox(); });
  return new THREE.Box3().setFromObject(character.object);
}

function assertFiniteTransforms(object) {
  object.updateMatrixWorld(true);
  object.traverse((part) => {
    const values = [...part.position.toArray(), ...part.quaternion.toArray(), ...part.scale.toArray(), ...part.matrixWorld.elements];
    assert.ok(values.every(Number.isFinite), `${part.name || part.type} has a non-finite transform`);
  });
}

function assertVisiblePart(part, label) {
  assert.ok(part?.isObject3D, `${label} must be an actual Three object`);
  let meshes = 0;
  part.traverse((item) => { if (item.isMesh && item.geometry?.attributes.position?.count > 0) meshes++; });
  assert.ok(meshes > 0, `${label} must contain visible mesh geometry`);
  const size = new THREE.Box3().setFromObject(part).getSize(new THREE.Vector3());
  assert.ok(size.toArray().every(Number.isFinite) && size.length() > .005, `${label} must have nonzero visible bounds`);
}

function pose(object) {
  const values = [];
  object.traverse((part) => values.push([...part.position.toArray(), ...part.quaternion.toArray(), ...part.scale.toArray()]));
  return values;
}

test("the actual skinned protagonist has a teenager-sized standing silhouette", async () => {
  const character = await loadCharacter();
  const height = bounds(character).getSize(new THREE.Vector3()).y;
  assert.ok(height >= 1.45 && height <= 1.68, `Expected a 1.45–1.68 m teenage protagonist, got ${height.toFixed(3)} m`);
});

test("teenage idle, walk and run remain centered, finite and human-sized", async () => {
  const character = await loadCharacter();
  for (const movement of [0, .4, 1]) {
    for (let sample = 0; sample < 60; sample++) {
      character.update(.05, movement, false);
      const box = bounds(character);
      assertFiniteTransforms(character.object);
      assert.ok(box.min.y > -.25 && box.max.y < 1.9, `Animation left the teenage vertical bounds: ${box.min.y}, ${box.max.y}`);
      assert.ok(Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) < 1.5, "Animation must not drift away from the player root");
    }
  }
});

test("airborne locomotion still produces a finite centered character", async () => {
  const character = await loadCharacter();
  for (let sample = 0; sample < 30; sample++) {
    character.update(.05, 1, true);
    const box = bounds(character);
    assertFiniteTransforms(character.object);
    assert.ok(box.min.y > -.25 && box.max.y < 1.9, "Jump animation must not stretch the body or move it off the player root");
  }
});

test("the companion has two articulated wings, a beak and visible tail feathers", () => {
  const { makeGuideSpirit } = guideAPI();
  const bird = makeGuideSpirit();
  assertVisiblePart(bird.userData.leftWing, "Left wing");
  assertVisiblePart(bird.userData.rightWing, "Right wing");
  assertVisiblePart(bird.userData.beak, "Beak");
  assert.ok(Array.isArray(bird.userData.tailFeathers) && bird.userData.tailFeathers.length >= 3, "Bird must have a visible feathered tail, not a spirit ring");
  bird.userData.tailFeathers.forEach((feather) => assertVisiblePart(feather, "Tail feather"));
  assert.ok(bird.userData.leftWing.position.x < 0 && bird.userData.rightWing.position.x > 0, "Wings must attach on opposite sides of the body");
});

test("normal companion flight moves the wings without invalid transforms", () => {
  const { makeGuideSpirit, animateGuideSpirit } = guideAPI();
  assert.equal(typeof animateGuideSpirit, "function", "Bird flight animation has not been implemented");
  const bird = makeGuideSpirit();
  animateGuideSpirit(bird, 0, .7, false);
  const initial = pose(bird);
  for (const time of [.017, .25, .61, 5, 5.6, 5.71, 10000]) {
    animateGuideSpirit(bird, time, .7, false);
    assertFiniteTransforms(bird);
  }
  assert.notDeepEqual(pose(bird), initial, "Flight must animate rather than remain a static decorative object");
});

test("reduced-motion companion keeps a stable pose after active flight", () => {
  const { makeGuideSpirit, animateGuideSpirit } = guideAPI();
  assert.equal(typeof animateGuideSpirit, "function", "Reduced-motion bird animation has not been implemented");
  const bird = makeGuideSpirit();
  animateGuideSpirit(bird, .61, 1, false);
  animateGuideSpirit(bird, 1, 1, true);
  const reducedPose = pose(bird);
  for (const time of [2, 5, 10000]) {
    animateGuideSpirit(bird, time, 1, true);
    assertFiniteTransforms(bird);
    assert.deepEqual(pose(bird), reducedPose, "Reduced motion must suppress repeated wing flapping and feather swaying");
  }
});

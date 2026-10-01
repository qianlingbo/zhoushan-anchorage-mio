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
  source += "\nglobalThis.guideAPI = { makeGuideSpirit, animateGuideSpirit: typeof animateGuideSpirit === 'function' ? animateGuideSpirit : undefined, makeMoveMarker: typeof makeMoveMarker === 'function' ? makeMoveMarker : undefined };";
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

const outfitColors = { jacket: 0x487b91, trousers: 0x394854, shoes: 0xd0dce0, trim: 0xc8dcdf, accent: 0xd69d4f };
const outfitFixtures = [
  { id: "basic", style: "hoodie", ...outfitColors },
  { id: "voyager", style: "traveler", ...outfitColors, jacket: 0x52765e, trim: 0xd5b686, accent: 0xa56b43 },
  { id: "master", style: "ceremonial", ...outfitColors, jacket: 0x27384f, trim: 0xe8c369, accent: 0xa9cee1 },
  ...["asia", "africa", "europe", "north-america", "south-america", "oceania", "antarctica"].map((region, index) => ({
    id: `regional-${region}`, style: "regional", region, ...outfitColors,
    jacket: 0x426579 + index * 0x050402, trim: 0xd4b98d - index * 0x020103, accent: 0x996745 + index * 0x020705
  }))
];

function visibleMeshes(object) {
  const meshes = [];
  object.traverse((part) => {
    if (!part.isMesh) return;
    for (let parent = part; parent; parent = parent.parent) if (!parent.visible) return;
    meshes.push(part);
  });
  return meshes;
}

function characterResources(object) {
  const objects = new Set(), geometries = new Set(), materials = new Set();
  object.traverse((part) => {
    objects.add(part);
    if (part.geometry) geometries.add(part.geometry);
    if (part.material) for (const material of Array.isArray(part.material) ? part.material : [part.material]) materials.add(material);
  });
  return { objects, geometries, materials };
}

function visibleShapeSignature(object) {
  return visibleMeshes(object).map((part) => [
    part.geometry.type, part.geometry.attributes.position.count,
    ...part.position.toArray(), ...part.scale.toArray()
  ].join(":")).sort().join("|");
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

test("all ten outfits change clothing while preserving the Asian teenager's skin and black hair", async () => {
  const character = await loadCharacter();
  assert.equal(typeof character.setOutfit, "function", "Character wardrobe API has not been implemented");
  let body;
  character.object.traverse((part) => { if (part.isSkinnedMesh) body = part; });
  const skin = new THREE.Color(0xd5a57f).toArray();
  const colors = body.geometry.attributes.color;
  const skinVertices = [];
  for (let index = 0; index < colors.count; index++) {
    if (skin.every((value, channel) => Math.abs(colors.array[index * 3 + channel] - value) < 1e-6)) skinVertices.push(index);
  }
  assert.ok(skinVertices.length > 100, "The real character must have identifiable skin vertices");
  const head = character.object.getObjectByName("mixamorigHead");
  const faceMaterials = new Map();
  head.traverse((part) => { if (part.isMesh) faceMaterials.set(part, part.material.color.getHex()); });
  assert.ok([...faceMaterials.values()].includes(0x151b20), "The actual face must retain black hair");
  const bodyPositions = [...body.geometry.attributes.position.array];
  const scale = character.object.scale.toArray();
  let previousClothes;
  for (const outfit of outfitFixtures) {
    character.setOutfit(outfit);
    for (const index of skinVertices) for (let channel = 0; channel < 3; channel++) {
      assert.ok(Math.abs(colors.array[index * 3 + channel] - skin[channel]) < 1e-6, `${outfit.id} recolored skin`);
    }
    for (const [part, color] of faceMaterials) assert.equal(part.material.color.getHex(), color, `${outfit.id} changed the face / hair`);
    const jacket = new THREE.Color(outfit.jacket).toArray();
    assert.ok(Array.from({ length: colors.count }, (_, index) => index).some((index) => jacket.every((value, channel) => Math.abs(colors.array[index * 3 + channel] - value) < 1e-6)), `${outfit.id} must actually change the jacket's rendered vertex colors`);
    if (previousClothes) assert.notDeepEqual([...colors.array], previousClothes, `${outfit.id} did not change actual clothing colors`);
    previousClothes = [...colors.array];
    assert.deepEqual([...body.geometry.attributes.position.array], bodyPositions, "Equipping clothing must not reshape the teenager or skeleton");
    assert.deepEqual(character.object.scale.toArray(), scale, "Equipping clothing must not change character stature");
  }
});

test("advanced and regional outfits add visible garment shapes, not only color swaps", async () => {
  const character = await loadCharacter();
  assert.equal(typeof character.setOutfit, "function", "Character wardrobe API has not been implemented");
  character.setOutfit(outfitFixtures[0]);
  const basicMeshes = new Set(visibleMeshes(character.object));
  const basicShape = visibleShapeSignature(character.object);
  for (const outfit of outfitFixtures.slice(1, 3)) {
    character.setOutfit(outfit);
    const added = visibleMeshes(character.object).filter((part) => !basicMeshes.has(part));
    assert.ok(added.length >= 3, `${outfit.id} must include a scarf / coat or shoulder cape / trim geometry`);
    assert.notEqual(visibleShapeSignature(character.object), basicShape, `${outfit.id} must visibly change garment shapes`);
  }
  const regionalShapes = new Set();
  for (const outfit of outfitFixtures.slice(3)) {
    character.setOutfit(outfit);
    assert.ok(visibleMeshes(character.object).some((part) => !basicMeshes.has(part)), `${outfit.id} must have a real local travel decoration`);
    regionalShapes.add(visibleShapeSignature(character.object));
  }
  assert.equal(regionalShapes.size, 7, "Each continent must have an original distinct travel decoration layout");
});

test("repeated advanced outfit changes keep a finite character-owned resource pool", async () => {
  const character = await loadCharacter();
  assert.equal(typeof character.setOutfit, "function", "Character wardrobe API has not been implemented");
  character.setOutfit(outfitFixtures[2]);
  const initial = characterResources(character.object);
  for (let repeat = 0; repeat < 30; repeat++) {
    for (const outfit of outfitFixtures) {
      character.setOutfit(outfit);
      const current = characterResources(character.object);
      assert.deepEqual(current.objects, initial.objects, "Changing outfits must not keep adding scene objects");
      assert.deepEqual(current.geometries, initial.geometries, "Changing outfits must reuse geometry");
      assert.deepEqual(current.materials, initial.materials, "Changing outfits must reuse materials");
    }
  }
});

test("every outfit preserves finite centered idle, walk, run and airborne animation", async () => {
  const character = await loadCharacter();
  assert.equal(typeof character.setOutfit, "function", "Character wardrobe API has not been implemented");
  for (const outfit of outfitFixtures) {
    character.setOutfit(outfit);
    for (const [movement, airborne] of [[0, false], [.4, false], [1, false], [1, true]]) {
      for (let sample = 0; sample < 15; sample++) {
        character.update(.05, movement, airborne);
        const box = bounds(character);
        assertFiniteTransforms(character.object);
        assert.ok(box.min.y > -.25 && box.max.y < 1.9, `${outfit.id} distorted the teenage animation bounds`);
        assert.ok(Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) < 1.5, `${outfit.id} drifted away from the player root`);
      }
    }
  }
});

test("the click-to-run marker is a small real ring and cross", () => {
  const { makeMoveMarker } = guideAPI();
  assert.equal(typeof makeMoveMarker, "function", "Move marker factory has not been implemented");
  const marker = makeMoveMarker();
  assert.ok(marker.isGroup, "Move marker must be an actual Three Group");
  const meshes = visibleMeshes(marker);
  const ring = meshes.find((part) => part.geometry.type === "RingGeometry");
  const bars = meshes.filter((part) => part.geometry.type === "BoxGeometry");
  assert.ok(ring, "Move marker must have a visible ring");
  assert.ok(ring.geometry.parameters.outerRadius <= .15, "Move marker ring must be smaller than the old .38 radius ring");
  assert.ok(bars.length >= 2, "Move marker must have two visible cross bars");
  for (const bar of bars) {
    const { width, height, depth } = bar.geometry.parameters;
    assert.ok(Math.max(width, height, depth) <= .11, "Move marker cross bars must be shorter than the old .24 bars");
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

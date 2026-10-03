const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const THREE = require("three");
const gameDirectory = path.resolve(__dirname, "..");

function environment() {
  const context = { THREE, continents: [{ id: "asia" }], performance,
    document: { getElementById: () => ({}) }, window: { innerWidth: 1280, matchMedia: () => ({ matches: false }) } };
  const nature = fs.readFileSync(path.join(gameDirectory, "nature.js"), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
  vm.runInNewContext(`${nature}\nglobalThis.nature = { makeSky, makeMeadow, natureUniforms };`, context);
  const source = fs.readFileSync(path.join(gameDirectory, "game.js"), "utf8").replace(/^import .*;\r?\n/gm, "");
  vm.runInNewContext(`${source.slice(0, source.indexOf('elements.start.addEventListener("click"'))}\nglobalThis.PortWorld = PortWorld;`, context);
  return context;
}

test("the sky uses linear blue colors instead of a bright grey shader palette", () => {
  const { nature } = environment();
  const sky = nature.makeSky();
  const { uZenith, uHorizon, uCloud } = sky.material.uniforms;
  assert.ok(uZenith?.value.isColor, "A managed linear zenith color is missing");
  assert.ok(uHorizon?.value.isColor && uCloud?.value.isColor);
  assert.ok(uZenith.value.b > uZenith.value.r * 3, "The upper sky must keep blue chroma");
  assert.ok(uZenith.value.g < .35, "The upper sky must retain exposure headroom");
  assert.ok(uHorizon.value.b > uHorizon.value.r && uHorizon.value.g > uZenith.value.g);
  assert.match(sky.material.fragmentShader, /mix\(uHorizon,uZenith/);
  assert.match(sky.material.fragmentShader, /tonemapping_fragment/);
  assert.match(sky.material.fragmentShader, /colorspace_fragment/);
});

test("thin grass blades retain a small scattered-light contribution without extra geometry", () => {
  const { nature } = environment();
  const meadow = nature.makeMeadow(() => ({ point: new THREE.Vector3(), quaternion: new THREE.Quaternion() }),
    () => true, () => .4, new THREE.Color(0x7b964a), .0001);
  const shader = { uniforms: {}, vertexShader: "#include <common>\n#include <begin_vertex>",
    fragmentShader: "#include <common>\n#include <color_fragment>\n#include <lights_fragment_end>" };
  meadow.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /reflectedLight\.indirectDiffuse\s*\+=\s*diffuseColor\.rgb/, "Grass backfaces still render as black paper cutouts");
  assert.ok(meadow.count > 0 && meadow.geometry.attributes.position.count === 15, "Keep the original instanced blade budget");
  assert.equal(shader.uniforms.uNatureTime, nature.natureUniforms.time);
  assert.equal(shader.uniforms.uWind, nature.natureUniforms.wind);
  assert.equal(shader.uniforms.uPlayer, nature.natureUniforms.player);
});

test("regional ground colors stay linear and the sky horizon matches the regional fog", () => {
  const { nature, PortWorld } = environment();
  const world = { world: new THREE.Group(), player: {}, guideSpirit: {}, moveMarker: {},
    birds: [], scene: new THREE.Scene(), sky: nature.makeSky(), locationGroups: new Map(),
    collectibles: new Map(), buildWorld() {} };
  world.scene.fog = new THREE.Fog(0x98c6d4, 105, 320);
  for (const climate of ["temperate", "polar", "tropical"]) {
    const region = { id: "asia", climate, ground: { dark: 0x34522b, light: 0x6c8b44, dry: 0xa69452, sand: 0xd4bb82 } };
    PortWorld.prototype.setRegion.call(world, region);
    for (const [name, color] of Object.entries(region.ground)) {
      assert.ok(nature.natureUniforms[name].value.equals(new THREE.Color(color)), `${name} was double-converted`);
    }
    assert.ok(world.sky.material.uniforms.uHorizon?.value.equals(world.scene.fog.color), "Sky and fog must meet without a grey seam");
  }
});

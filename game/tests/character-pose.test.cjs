const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL, fileURLToPath } = require("node:url");

const threeRoot = path.dirname(path.dirname(require.resolve("three")));
const gameDirectory = path.resolve(__dirname, "..");
const moduleURL = pathToFileURL(path.join(threeRoot, "build/three.module.js")).href;
const loaderURL = pathToFileURL(path.join(threeRoot, "examples/jsm/loaders/GLTFLoader.js")).href;

// Parse the shipped geometry and animations, omitting only browser-only images.
async function character() {
  const THREE = await import(moduleURL);
  const { GLTFLoader } = await import(loaderURL);
  const originalLoad = GLTFLoader.prototype.loadAsync;
  const originalProgress = globalThis.ProgressEvent;
  globalThis.ProgressEvent = class { constructor(type, fields) { this.type = type; Object.assign(this, fields); } };
  GLTFLoader.prototype.loadAsync = (url) => {
    const binary = fs.readFileSync(fileURLToPath(url));
    const length = binary.readUInt32LE(12);
    const json = JSON.parse(binary.subarray(20, 20 + length).toString());
    delete json.images; delete json.textures; delete json.samplers; delete json.materials;
    json.meshes.forEach((mesh) => mesh.primitives.forEach((primitive) => { delete primitive.material; }));
    json.buffers[0].uri = `data:application/octet-stream;base64,${binary.subarray(28 + length).toString("base64")}`;
    return new GLTFLoader().parseAsync(JSON.stringify(json), "");
  };
  const filename = path.join(gameDirectory, "character.js");
  const source = fs.readFileSync(filename, "utf8")
    .replace('from "three"', `from "${moduleURL}"`)
    .replace('from "three/addons/loaders/GLTFLoader.js"', `from "${loaderURL}"`)
    .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(filename).href));
  try {
    const { loadAgentCharacter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
    return { THREE, ...(await loadAgentCharacter()) };
  } finally {
    GLTFLoader.prototype.loadAsync = originalLoad;
    if (originalProgress === undefined) delete globalThis.ProgressEvent;
    else globalThis.ProgressEvent = originalProgress;
  }
}

function point(agent, name) {
  agent.object.updateMatrixWorld(true);
  return agent.object.getObjectByName(`mixamorig${name}`).getWorldPosition(new agent.THREE.Vector3());
}

function soleHeight(agent, side) {
  let body;
  agent.object.traverse((part) => { if (part.isSkinnedMesh) body = part; });
  const position = body.geometry.attributes.position;
  let lowest = Infinity;
  const vertex = new agent.THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    if (position.getY(index) >= .027 || Math.sign(position.getX(index)) !== side) continue;
    body.getVertexPosition(index, vertex);
    body.localToWorld(vertex);
    lowest = Math.min(lowest, vertex.y);
  }
  return lowest;
}

test("neutral idle faces forward with planted feet rather than a staggered swagger", async () => {
  const agent = await character();
  for (let sample = 0; sample < 60; sample++) {
    agent.update(.05, 0, false);
    const left = point(agent, "LeftFoot"), right = point(agent, "RightFoot");
    const hips = point(agent, "Hips"), head = point(agent, "Head");
    assert.ok(Math.abs(left.z - right.z) < .075, `Standing feet are staggered by ${(left.z - right.z).toFixed(3)} m`);
    assert.ok(Math.abs(head.x - hips.x) < .035 && Math.abs(head.z - hips.z) < .075, "The idle spine should remain upright over the hips");
    const facing = new agent.THREE.Vector3(0, 0, 1).applyQuaternion(agent.object.getObjectByName("mixamorigHips").getWorldQuaternion(new agent.THREE.Quaternion()));
    assert.ok(facing.z > .98, "Idle hips should face the player's forward direction");
    const a = soleHeight(agent, 1), b = soleHeight(agent, -1);
    assert.ok(a >= -.008 && a <= .012 && b >= -.008 && b <= .012, `Idle shoes should meet the ground: ${a}, ${b}`);
  }
});

test("the close-up face has inset eyes and a continuous cheek surface", async () => {
  const agent = await character();
  const headBone = agent.object.getObjectByName("mixamorigHead");
  const head = headBone.children.find((part) => part.isGroup && part.children.some((mesh) => mesh.material?.color.getHex() === 0xe9e0d1));
  assert.ok(head, "The actual teenage face must be present");
  const skull = head.children.find((mesh) => mesh.material?.color.getHex() === 0xd5a57f && mesh.scale.y > .13);
  assert.ok(skull, "The face must retain a smooth base head shape");
  const surface = (x, y) => skull.position.z + skull.scale.z * Math.sqrt(Math.max(0, 1 - (x / skull.scale.x) ** 2 - (y / skull.scale.y) ** 2));
  const vertex = new agent.THREE.Vector3();
  for (const mesh of head.children) {
    const color = mesh.material?.color.getHex();
    if (mesh === skull || (color !== 0xd5a57f && color !== 0xe9e0d1)) continue;
    mesh.updateMatrix();
    const position = mesh.geometry.attributes.position;
    for (let index = 0; index < position.count; index++) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrix);
      if (Math.abs(vertex.x) < .025 || Math.abs(vertex.x) > .079 || vertex.y < -.045 || vertex.y > .040 || vertex.z < .05) continue;
      assert.ok(vertex.z <= surface(vertex.x, vertex.y) + .004, `${color === 0xe9e0d1 ? "Eye" : "Cheek"} projects away from the face by ${(vertex.z - surface(vertex.x, vertex.y)).toFixed(4)} m`);
    }
  }
});

test("relaxed idle has lowered arms and retains finite walk/run/jump articulation", async () => {
  const agent = await character();
  for (const side of ["Left", "Right"]) {
    const hand = point(agent, `${side}Hand`), shoulder = point(agent, `${side}Arm`);
    assert.ok(hand.y < shoulder.y - .3, "Resting arms should hang below the shoulders rather than form a T-pose");
  }
  const idleKnee = point(agent, "LeftLeg");
  let animated = false;
  for (const [movement, airborne] of [[.4, false], [1, false], [1, true], [0, false]]) {
    for (let sample = 0; sample < 30; sample++) {
      agent.update(.04, movement, airborne);
      agent.object.updateMatrixWorld(true);
      agent.object.traverse((part) => {
        assert.ok([...part.position.toArray(), ...part.quaternion.toArray(), ...part.scale.toArray(), ...part.matrixWorld.elements].every(Number.isFinite), "Character transforms must remain finite");
      });
      const knee = point(agent, "LeftLeg");
      assert.ok(Math.abs(knee.x) < .5 && knee.y > .2 && knee.y < 1.3 && Math.abs(knee.z) < .65, "The legs must stay centered on the player");
      if (movement > 0 && knee.distanceTo(idleKnee) > .05) animated = true;
    }
  }
  assert.ok(animated, "Walking/running must still move the real skinned character");
});

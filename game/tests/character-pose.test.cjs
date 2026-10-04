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
  const head = headBone.children.find((part) => part.isGroup && part.children.some((mesh) => mesh.material?.color.getHex() === 0xe9e0d1)).clone(true);
  assert.ok(head, "The actual teenage face must be present");
  head.position.set(0, 0, 0); head.quaternion.identity(); head.scale.setScalar(1); head.updateMatrixWorld(true);
  const skull = head.children.find((mesh) => mesh.material?.color.getHex() === 0xd5a57f && mesh.scale.y > .13);
  assert.ok(skull, "The face must retain a smooth base head shape");
  // Measure the actual skin mesh rather than assume that a sculpted face is
  // still an ellipsoid. The same 4 mm inset/protrusion limit remains in force.
  const ray = new agent.THREE.Raycaster(new agent.THREE.Vector3(), new agent.THREE.Vector3(0, 0, -1));
  const surface = (x, y) => {
    ray.ray.origin.set(x, y, 1);
    const hit = ray.intersectObject(skull)[0];
    assert.ok(hit, "Each measured facial feature must have an actual skin surface behind it");
    return hit.point.z;
  };
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

test("both inset eyes face the viewer and are visible in front of the hair and skin", async () => {
  const agent = await character();
  const headBone = agent.object.getObjectByName("mixamorigHead");
  const head = headBone.children.find((part) => part.isGroup && part.children.some((mesh) => mesh.material?.color.getHex() === 0xe9e0d1)).clone(true);
  head.position.set(0, 0, 0); head.quaternion.identity(); head.scale.setScalar(1); head.updateMatrixWorld(true);
  const whites = head.children.filter((mesh) => mesh.material?.color.getHex() === 0xe9e0d1);
  assert.equal(whites.length, 2, "Both eyes must have actual white geometry");
  for (const eye of whites) {
    const normals = eye.geometry.attributes.normal;
    assert.ok(Array.from({ length: normals.count }, (_, index) => normals.getZ(index)).every((normal) => normal > .5), "The curved eye surface must face forward rather than be culled");
  }
  for (const side of [-1, 1]) {
    const visible = [];
    for (const dx of [-.012, -.006, 0, .006, .012]) {
      const ray = new agent.THREE.Raycaster(new agent.THREE.Vector3(side * .040 + dx, .024, 1), new agent.THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObject(head, true)[0];
      if (hit) visible.push(hit.object.material.color.getHex());
    }
    assert.ok(visible.filter((color) => color === 0xe9e0d1).length >= 3, `${side < 0 ? "Right" : "Left"} eye white is mostly hidden behind hair / skin`);
    assert.ok(visible.includes(0x29221d), `${side < 0 ? "Right" : "Left"} iris is hidden behind hair / skin`);
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

test("standing travel trousers taper at the calves while leaving knee room", async () => {
  const agent = await character();
  let body;
  agent.object.traverse((part) => { if (part.isSkinnedMesh) body = part; });
  const position = body.geometry.attributes.position;
  const vertex = new agent.THREE.Vector3();
  const span = (height, side) => {
    const points = [];
    for (let index = 0; index < position.count; index++) {
      if (Math.abs(position.getY(index) - height) > .025 || Math.sign(position.getX(index)) !== side) continue;
      body.getVertexPosition(index, vertex); body.localToWorld(vertex); points.push(vertex.clone());
    }
    assert.ok(points.length >= 8, "The measured trouser band must contain actual standing mesh vertices");
    return new agent.THREE.Box3().setFromPoints(points).getSize(new agent.THREE.Vector3());
  };
  for (const side of [-1, 1]) {
    for (const height of [.35, .45]) {
      const calf = span(height, side);
      assert.ok(calf.x <= .12 && calf.z <= .12, `Lower trousers are ballooned at ${height} m: ${calf.x.toFixed(3)} × ${calf.z.toFixed(3)} m`);
      assert.ok(calf.x >= .045 && calf.z >= .06, "The tapered lower trousers must still have human leg volume");
    }
    const knee = span(.65, side);
    assert.ok(knee.x >= .12 && knee.x <= .16 && knee.z >= .12 && knee.z <= .16, "Tapering must preserve room at the knees");
  }
});

test("hoodie covers the shoulder band while leaving the upper neck and hands as skin", async () => {
  const agent = await character();
  let body;
  agent.object.traverse((part) => { if (part.isSkinnedMesh) body = part; });
  const position = body.geometry.attributes.position, colors = body.geometry.attributes.color;
  const shoulder = [], exposed = [];
  for (let index = 0; index < position.count; index++) {
    const x = Math.abs(position.getX(index)), y = position.getY(index), z = position.getZ(index);
    if (x >= .065 && x < .105 && y >= 1.28 && y < 1.325 && z > .015) shoulder.push(index);
    if ((x < .035 && y >= 1.345 && y < 1.375) || x > .54) exposed.push(index);
  }
  assert.ok(shoulder.length >= 20 && exposed.length > 100, "Tests must measure the actual shoulder and exposed skin vertices");
  const equal = (index, color) => color.every((value, channel) => Math.abs(colors.array[index * 3 + channel] - value) < 1e-6);
  const skin = new agent.THREE.Color(0xd5a57f).toArray();
  for (const [id, jacket] of [["basic", 0x487b91], ["voyager", 0x52765e], ["master", 0x27384f]]) {
    agent.setOutfit({ id, style: "hoodie", jacket, trousers: 0x394854, shoes: 0xd0dce0, trim: 0xc8dcdf, accent: 0xd69d4f });
    const cloth = new agent.THREE.Color(jacket).toArray();
    assert.ok(shoulder.every((index) => equal(index, cloth)), `${id} leaves a bare skin band across the hoodie shoulders`);
    assert.ok(exposed.every((index) => equal(index, skin)), "Covering the shoulders must not recolor the upper neck or hands");
  }
});

test("nose bridge, nose wings and cheek transitions belong to one continuous sculpted skin surface", async () => {
  const agent = await character();
  const head = agent.object.getObjectByName("mixamorigHead").children.find((part) => part.isGroup && part.children.some((mesh) => mesh.material?.color.getHex() === 0xe9e0d1)).clone(true);
  head.position.set(0, 0, 0); head.quaternion.identity(); head.scale.setScalar(1); head.updateMatrixWorld(true);
  const skull = head.children.find((mesh) => mesh.material?.color.getHex() === 0xd5a57f && mesh.scale.y > .13);
  const ray = new agent.THREE.Raycaster(new agent.THREE.Vector3(), new agent.THREE.Vector3(0, 0, -1));
  const surface = (x, y) => {
    ray.ray.origin.set(x, y, 1);
    const hit = ray.intersectObject(skull)[0];
    assert.ok(hit, "The facial landmarks must lie on the main skin surface");
    return hit.point.z;
  };
  assert.ok(surface(0, -.014) - surface(.024, -.014) >= .008, "The main face mesh must form a nose tip, not rely on a separate sphere");
  assert.ok(surface(0, .013) - surface(.020, .013) >= .003, "The nose bridge must blend continuously into the face");
  assert.ok(surface(.014, -.022) - surface(.030, -.022) >= .004, "The nose wings must have a continuous transition into the cheeks");
  assert.ok(surface(.050, -.015) - surface(.050, .025) >= .004, "The cheek surface must transition into a gentle eye socket rather than remain a featureless ball");
  for (const y of [-.022, -.014, .006, .020]) {
    ray.ray.origin.set(0, y, 1);
    const skin = ray.intersectObject(head, true).find((hit) => hit.object.material?.color.getHex() === 0xd5a57f);
    assert.equal(skin?.object, skull, "The visible nose must be part of the base skin mesh, not an intersecting skin sphere");
  }
  const colors = skull.geometry.attributes.color;
  assert.ok(skull.material.vertexColors && colors?.count === skull.geometry.attributes.position.count, "The face must have restrained per-vertex skin tone variation");
  assert.ok(Math.max(...colors.array) - Math.min(...colors.array) > .005 && Math.max(...colors.array) <= 1, "Skin tones must vary subtly without replacing the base skin color");
  const vertex = new agent.THREE.Vector3();
  for (const lip of head.children.filter((mesh) => mesh.material?.color.getHex() === 0xa26959)) {
    lip.updateMatrix();
    const position = lip.geometry.attributes.position;
    for (let index = 0; index < position.count; index++) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(lip.matrix);
      const gap = vertex.z - surface(vertex.x, vertex.y);
      assert.ok(gap >= -.001 && gap <= .003, `Lips must follow the skin surface, not float or sink away from it (${gap.toFixed(4)} m)`);
    }
  }
});

test("head and short hair have natural teenage proportions with the chin connected to the neck", async () => {
  const agent = await character();
  agent.object.updateMatrixWorld(true);
  const head = agent.object.getObjectByName("mixamorigHead").children.find((part) => part.isGroup && part.children.some((mesh) => mesh.material?.color.getHex() === 0xe9e0d1));
  let body;
  agent.object.traverse((part) => { if (part.isSkinnedMesh) body = part; });
  body.computeBoundingBox();
  const height = new agent.THREE.Box3().setFromObject(agent.object).getSize(new agent.THREE.Vector3()).y;
  const headHeight = new agent.THREE.Box3().setFromObject(head).getSize(new agent.THREE.Vector3()).y;
  const ratio = height / headHeight;
  assert.ok(ratio >= 6.5 && ratio <= 7.2, `Expected a teenage 6.5–7.2 head-height silhouette, got ${ratio.toFixed(2)}`);
  const skull = head.children.find((mesh) => mesh.material?.color.getHex() === 0xd5a57f && mesh.scale.y > .13);
  const chin = new agent.THREE.Box3().setFromObject(skull).min.y;
  const visibleVertices = new Set(body.geometry.index.array), position = body.geometry.attributes.position;
  const vertex = new agent.THREE.Vector3();
  let neckTop = -Infinity, samples = 0;
  for (const index of visibleVertices) {
    if (Math.abs(position.getX(index)) >= .085 || position.getY(index) < 1.33 || position.getY(index) >= 1.375) continue;
    body.getVertexPosition(index, vertex); body.localToWorld(vertex);
    neckTop = Math.max(neckTop, vertex.y); samples++;
  }
  assert.ok(samples > 20, "Neck contact must be measured against visible shipped mesh vertices");
  const connectedNeck = agent.object.getObjectByName("agent-neck");
  if (connectedNeck) neckTop = Math.max(neckTop, new agent.THREE.Box3().setFromObject(connectedNeck).max.y);
  assert.ok(chin <= neckTop + .005 && chin >= neckTop - .035, `The resized chin must join the neck rather than hover: chin ${chin}, neck ${neckTop}`);
});

test("the rendered body index contains no leftover source adult jaw or cheek triangles", async () => {
  const agent = await character();
  let body;
  agent.object.traverse((part) => { if (part.isSkinnedMesh) body = part; });
  const headIndex = body.skeleton.bones.findIndex((bone) => bone.name === "mixamorigHead");
  assert.ok(headIndex >= 0, "The shipped skeleton must be measured");
  const indices = body.geometry.attributes.skinIndex, weights = body.geometry.attributes.skinWeight;
  for (const vertex of new Set(body.geometry.index.array)) {
    let headWeight = 0;
    for (let channel = 0; channel < 4; channel++) if (indices.array[vertex * 4 + channel] === headIndex) headWeight += weights.array[vertex * 4 + channel];
    assert.ok(headWeight <= .1, `Rendered source vertex ${vertex} retains ${(headWeight * 100).toFixed(1)}% adult-head weight`);
  }
});

test("front and side rays see continuous skin from the collar to the new chin", async () => {
  const agent = await character();
  const skin = new agent.THREE.Color(0xd5a57f).toArray();
  const ray = new agent.THREE.Raycaster();
  const isSkin = (hit) => {
    if (hit.object.material.color.getHex() === 0xd5a57f) return true;
    const colors = hit.object.geometry.attributes.color;
    return colors && [hit.face.a, hit.face.b, hit.face.c].every((index) => skin.every((value, channel) => Math.abs(colors.array[index * 3 + channel] - value) < 1e-6));
  };
  for (const time of [0, .3, .9]) {
    agent.update(time, 0, false); agent.object.updateMatrixWorld(true);
    const neck = point(agent, "Neck");
    for (const offset of [.034, .041, .048, .055, .062, .069, .076]) {
      const height = neck.y + offset;
      for (const x of [-.014, 0, .014]) {
        ray.set(new agent.THREE.Vector3(x, height, 1), new agent.THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(agent.object, true).find((hit) => hit.object.visible);
        assert.ok(hit && isSkin(hit), `Front neck skin has a rendered gap at x=${x}, y=${height.toFixed(4)}`);
      }
      for (const side of [-1, 1]) {
        ray.set(new agent.THREE.Vector3(side, height, -.015), new agent.THREE.Vector3(-side, 0, 0));
        const hit = ray.intersectObject(agent.object, true).find((hit) => hit.object.visible);
        assert.ok(hit && isSkin(hit), `Side neck skin has a rendered gap at y=${height.toFixed(4)}`);
      }
    }
  }
});

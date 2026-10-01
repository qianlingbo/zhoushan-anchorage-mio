import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Original teenage facial geometry and reshaped clothing; the civilian body
// topology and animation skeleton come from the embedded Mixamo reference.
function makeAgentHead() {
  const head = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd5a57f, roughness: .64 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x151b20, roughness: .9 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe9e0d1, roughness: .4 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x29221d, roughness: .42 });
  const lip = new THREE.MeshStandardMaterial({ color: 0xa26959, roughness: .75 });
  const add = (geometry, material, position, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = mesh.receiveShadow = true;
    head.add(mesh); return mesh;
  };
  add(new THREE.SphereGeometry(1, 36, 28), skin, [0, 0, -.008], [.106, .136, .099]);
  add(new THREE.SphereGeometry(1, 28, 20), skin, [0, -.054, .017], [.084, .071, .078]);
  for (const side of [-1, 1]) {
    add(new THREE.SphereGeometry(1, 20, 14), skin, [side * .101, -.010, -.005], [.014, .025, .014]);
    add(new THREE.SphereGeometry(1, 20, 14), skin, [side * .056, -.015, .061], [.035, .034, .033]);
    add(new THREE.SphereGeometry(1, 20, 14), eyeWhite, [side * .040, .024, .081], [.020, .0075, .007]);
    add(new THREE.SphereGeometry(1, 18, 12), iris, [side * .040, .024, .087], [.0067, .0067, .002]);
    const eyelid = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(side * .021, .023, .087),
      new THREE.Vector3(side * .038, .034, .092),
      new THREE.Vector3(side * .059, .026, .082)
    );
    add(new THREE.TubeGeometry(eyelid, 10, .0018, 5, false), skin, [0, 0, 0]);
    const brow = add(new THREE.CapsuleGeometry(.0028, .029, 4, 8), hair, [side * .040, .045, .082]);
    brow.rotation.z = side * 1.48;
  }
  add(new THREE.SphereGeometry(1, 24, 16), skin, [0, .006, .089], [.011, .026, .014]);
  add(new THREE.SphereGeometry(1, 20, 14), skin, [0, -.014, .100], [.015, .010, .012]);
  add(new THREE.SphereGeometry(1, 24, 12), lip, [0, -.056, .088], [.022, .0026, .004]);
  add(new THREE.SphereGeometry(1, 24, 12), lip, [0, -.061, .087], [.018, .0035, .004]);
  add(new THREE.SphereGeometry(.109, 32, 22, 0, Math.PI * 2, 0, Math.PI * .56), hair, [0, .031, -.015], [1, 1.06, .97]);
  // Tousled short black hair, softer jaw and a shorter nose distinguish the
  // teenager from the previous adult, rather than merely reducing root scale.
  for (let index = 0; index < 7; index++) {
    const lock = add(new THREE.SphereGeometry(1, 16, 12), hair, [-.087 + index * .027, .078 + Math.sin(index * 1.4) * .012, .054], [.024, .038, .046]);
    lock.rotation.z = -.32 + Math.sin(index) * .24;
  }
  for (const side of [-1, 1]) add(new THREE.SphereGeometry(1, 16, 12), hair, [side * .092, .018, -.031], [.015, .059, .052]);
  return head;
}

function dressPortAgent(agent, target) {
  const geometry = target.geometry;
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const clothingParts = new Uint8Array(position.count);
  const skin = new THREE.Color(0xd5a57f), jacket = new THREE.Color(0x487b91);
  const trousers = new THREE.Color(0x394854), shoes = new THREE.Color(0xd0dce0);
  const sole = new THREE.Color(0x647680);
  const vertex = new THREE.Vector3();
  const bodyIndices = [];
  const indices = geometry.index.array;
  for (let index = 0; index < indices.length; index += 3) {
    // The existing adult head and hairstyle are removed, not covered.
    if ([indices[index], indices[index + 1], indices[index + 2]].every((vertexIndex) => position.getY(vertexIndex) < 1.375)) {
      bodyIndices.push(indices[index], indices[index + 1], indices[index + 2]);
    }
  }
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const color = vertex.y < .027 ? sole : vertex.y < .105 ? shoes : vertex.y < .92 ? trousers
      : Math.abs(vertex.x) > .54 || (vertex.y > 1.28 && Math.abs(vertex.x) < .105) ? skin : jacket;
    clothingParts[index] = color === jacket ? 1 : color === trousers ? 2 : color === shoes ? 3 : 0;
    colors.set(color.toArray(), index * 3);
    const hip = Math.exp(-Math.pow((vertex.y - .87) / .16, 2));
    vertex.x *= 1 - .17 * hip;
    if (vertex.y > .98 && vertex.y < 1.29 && Math.abs(vertex.x) < .19) {
      // Remove the source adult chest contour and broaden its very pinched
      // waist into the straighter silhouette of a loose teenage hoodie.
      const waist = Math.exp(-Math.pow((vertex.y - 1.075) / .08, 2));
      vertex.x *= 1 + .65 * waist;
      if (vertex.z > .035) vertex.z = .035 + (vertex.z - .035) * .42;
    }
    vertex.z *= .92;
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(bodyIndices);
  geometry.computeVertexNormals();
  position.needsUpdate = true;
  target.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82 });
  const mount = (boneName, object, worldPosition) => {
    const bone = agent.scene.getObjectByName(boneName);
    const transform = new THREE.Matrix4().makeTranslation(...worldPosition);
    transform.premultiply(bone.matrixWorld.clone().invert());
    object.applyMatrix4(transform); bone.add(object);
  };
  mount("mixamorigHead", makeAgentHead(), [0, 1.495, -.008]);
  const hoodie = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x487b91, roughness: .9 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc8dcdf, roughness: .82 });
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), cloth);
  hood.position.set(0, .108, -.063); hood.scale.set(.109, .077, .044); hoodie.add(hood);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(.13, .047, .012), cloth);
  pocket.position.set(0, -.063, .066); hoodie.add(pocket);
  for (const side of [-1, 1]) {
    const cord = new THREE.Mesh(new THREE.CapsuleGeometry(.0028, .075, 4, 7), trim);
    cord.position.set(side * .028, .036, .073); hoodie.add(cord);
  }
  mount("mixamorigSpine2", hoodie, [0, 1.16, 0]);
  const accent = new THREE.MeshStandardMaterial({ color: 0xd69d4f, roughness: .65 });
  const decorations = new THREE.Group();
  mount("mixamorigSpine2", decorations, [0, 1.16, 0]);
  const add = (group, geometry, material, at, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at); mesh.scale.set(...scale);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  };
  const layer = () => { const group = new THREE.Group(); group.visible = false; decorations.add(group); return group; };
  const scarf = layer();
  const collar = add(scarf, new THREE.TorusGeometry(.077, .015, 8, 24), accent, [0, .123, 0], [1, 1, .7]);
  collar.rotation.x = Math.PI / 2;
  add(scarf, new THREE.BoxGeometry(.035, .17, .012), accent, [.047, .036, .085]);
  const badge = add(scarf, new THREE.CylinderGeometry(.015, .015, .006, 16), trim, [-.066, .046, .083]);
  badge.rotation.x = Math.PI / 2;
  const coat = layer();
  for (const side of [-1, 1]) {
    add(coat, new THREE.BoxGeometry(.044, .23, .016), cloth, [side * .084, -.055, .075]);
    add(coat, new THREE.BoxGeometry(.004, .225, .008), trim, [side * .063, -.055, .085]);
  }
  const ceremonial = layer();
  for (const side of [-1, 1]) {
    add(ceremonial, new THREE.SphereGeometry(1, 16, 12), cloth, [side * .102, .107, -.011], [.061, .025, .084]);
    add(ceremonial, new THREE.BoxGeometry(.073, .009, .13), trim, [side * .10, .096, -.006]);
    add(ceremonial, new THREE.BoxGeometry(.006, .19, .009), trim, [side * .041, -.018, .087]);
    for (let index = 0; index < 3; index++) {
      add(ceremonial, new THREE.SphereGeometry(.005, 8, 6), trim, [side * .052, .04 - index * .031, .091]);
    }
  }
  add(ceremonial, new THREE.BoxGeometry(.18, .006, .012), trim, [0, -.12, .078]);
  const regional = new Map();
  ["asia", "europe", "africa", "north-america", "south-america", "oceania", "antarctica"].forEach((region, index) => {
    const group = layer(); regional.set(region, group);
    const cape = add(group, new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .6), cloth,
      [0, .048 - index * .004, -.056], [.122 + index * .003, .09 + index * .008, .073]);
    cape.rotation.x = -.24;
    for (let stripe = 0; stripe <= index; stripe++) {
      const ornament = add(group, new THREE.BoxGeometry(.022, .009, .008), stripe % 2 ? trim : accent,
        [-.066 + stripe * .018, .065 - stripe * .012, .09]);
      ornament.rotation.z = (index % 3 - 1) * .4;
    }
    if (["europe", "oceania", "antarctica"].includes(region)) {
      const neck = add(group, new THREE.TorusGeometry(.077, region === "antarctica" ? .023 : .013, 8, 24), accent, [0, .123, 0]);
      neck.rotation.x = Math.PI / 2;
      add(group, new THREE.BoxGeometry(.039, .15 + index * .005, .016), accent, [.052, .016, .085]);
    }
    if (["asia", "africa", "south-america"].includes(region)) {
      add(group, new THREE.BoxGeometry(.183, .019, .012), accent, [0, -.102, .078]);
    }
    if (region === "north-america") {
      const sash = add(group, new THREE.BoxGeometry(.025, .2, .012), accent, [0, -.015, .088]);
      sash.rotation.z = -.6;
    }
  });
  return (outfit) => {
    const palette = [null, new THREE.Color(outfit.jacket), new THREE.Color(outfit.trousers), new THREE.Color(outfit.shoes)];
    for (let index = 0; index < position.count; index++) {
      if (clothingParts[index]) colors.set(palette[clothingParts[index]].toArray(), index * 3);
    }
    geometry.attributes.color.needsUpdate = true;
    cloth.color.setHex(outfit.jacket); trim.color.setHex(outfit.trim); accent.color.setHex(outfit.accent);
    trim.metalness = outfit.style === "ceremonial" ? .35 : .08;
    hoodie.visible = outfit.style === "hoodie" || outfit.style === "traveler";
    scarf.visible = outfit.style === "traveler";
    coat.visible = outfit.style === "traveler" || outfit.style === "ceremonial";
    ceremonial.visible = outfit.style === "ceremonial";
    regional.forEach((group, region) => { group.visible = outfit.style === "regional" && outfit.region === region; });
    agent.scene.userData.outfitId = outfit.id;
  };
}

function locomotionClips(agent, locomotion, target, source, heightRatio) {
  const targetBones = [...target.skeleton.bones].sort((a, b) => {
    const depth = (bone) => { let count = 0; while (bone.parent) { count++; bone = bone.parent; } return count; };
    return depth(a) - depth(b);
  });
  const sourceBones = new Map(source.skeleton.bones.map((bone) => [bone.name, bone]));
  const bind = new Map(targetBones.map((bone) => [bone.name, {
    position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
    world: bone.getWorldQuaternion(new THREE.Quaternion()),
    sourceInverse: sourceBones.get(bone.name)?.getWorldQuaternion(new THREE.Quaternion()).invert()
  }]));
  const targetHip = targetBones.find((bone) => bone.name === "mixamorigHips");
  const sourceHip = sourceBones.get(targetHip.name);
  const hipHeight = sourceHip.getWorldPosition(new THREE.Vector3()).y;
  const alignment = bind.get(targetHip.name).world.clone().multiply(bind.get(targetHip.name).sourceInverse);
  const inverseAlignment = alignment.clone().invert();
  const sourceMixer = new THREE.AnimationMixer(locomotion.scene);
  const parentRotation = new THREE.Quaternion();
  const rotation = new THREE.Quaternion();
  const displacement = new THREE.Vector3();
  const hipOrigin = targetHip.getWorldPosition(new THREE.Vector3());
  const restore = () => {
    targetBones.forEach((bone) => {
      const rest = bind.get(bone.name);
      bone.position.copy(rest.position);
      bone.quaternion.copy(rest.quaternion);
      bone.scale.copy(rest.scale);
    });
    agent.scene.updateMatrixWorld(true);
  };
  const clips = ["Idle", "Walk", "Run"].map((name) => {
    const reference = THREE.AnimationClip.findByName(locomotion.animations, name).clone();
    reference.tracks = reference.tracks.filter((track) => sourceBones.has(track.name.split(".")[0]));
    const action = sourceMixer.clipAction(reference).play();
    const times = [];
    const values = new Map(targetBones.map((bone) => [bone.name, []]));
    const hipPositions = [];
    const frames = Math.ceil(reference.duration * 30);
    for (let frame = 0; frame <= frames; frame++) {
      const time = Math.min(frame / 30, reference.duration);
      times.push(time);
      sourceMixer.setTime(time);
      locomotion.scene.updateMatrixWorld(true);
      restore();
      for (const bone of targetBones) {
        const rest = bind.get(bone.name);
        const sourceBone = sourceBones.get(bone.name);
        if (sourceBone) {
          sourceBone.getWorldQuaternion(rotation);
          rotation.premultiply(alignment).multiply(rest.sourceInverse).multiply(inverseAlignment).multiply(rest.world);
          bone.parent.getWorldQuaternion(parentRotation).invert();
          bone.quaternion.copy(parentRotation.multiply(rotation)).normalize();
        }
        if (bone === targetHip) {
          const offset = (sourceHip.getWorldPosition(displacement).y - hipHeight) * heightRatio;
          displacement.copy(hipOrigin).y += offset;
          bone.position.copy(bone.parent.worldToLocal(displacement));
          hipPositions.push(...bone.position.toArray());
        }
        bone.updateWorldMatrix(false, false);
        values.get(bone.name).push(...bone.quaternion.toArray());
      }
    }
    action.stop();
    const tracks = targetBones.map((bone) => new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values.get(bone.name)));
    tracks.push(new THREE.VectorKeyframeTrack(`${targetHip.name}.position`, times, hipPositions));
    return new THREE.AnimationClip(name, reference.duration, tracks);
  });
  sourceMixer.stopAllAction();
  restore();
  return clips;
}

export async function loadAgentCharacter() {
  const loader = new GLTFLoader();
  const [agent, locomotion] = await Promise.all([
    loader.loadAsync(new URL("./assets/port-agent.glb", import.meta.url).href),
    loader.loadAsync(new URL("./assets/locomotion.glb", import.meta.url).href)
  ]);
  let target, source;
  agent.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = object.receiveShadow = true;
    if (object.material.map) object.material.map.anisotropy = 4;
    if (object.isSkinnedMesh) target = object;
  });
  locomotion.scene.traverse((object) => {
    if (object.isSkinnedMesh && (!source || object.skeleton.bones.length > source.skeleton.bones.length)) source = object;
  });
  agent.scene.updateMatrixWorld(true);
  locomotion.scene.updateMatrixWorld(true);
  const height = new THREE.Box3().setFromObject(agent.scene).getSize(new THREE.Vector3()).y;
  const sourceHeight = new THREE.Box3().setFromObject(locomotion.scene).getSize(new THREE.Vector3()).y;
  const setOutfit = dressPortAgent(agent, target);
  // Preserve the existing bind scale and proven animation transfer. The mesh
  // has already been reshaped; this normalization sets its teenage stature.
  const clips = locomotionClips(agent, locomotion, target, source, height / sourceHeight);
  const mixer = new THREE.AnimationMixer(agent.scene);
  const actions = clips.map((clip) => mixer.clipAction(clip).play());
  actions[1].setEffectiveWeight(0);
  actions[2].setEffectiveWeight(0);
  mixer.update(0);
  agent.scene.updateMatrixWorld(true);
  target.computeBoundingBox();
  const standingHeight = new THREE.Box3().setFromObject(agent.scene).getSize(new THREE.Vector3()).y;
  agent.scene.scale.setScalar(1.58 / standingHeight);
  agent.scene.updateMatrixWorld(true);
  agent.scene.position.y -= new THREE.Box3().setFromObject(agent.scene).min.y;
  return {
    object: agent.scene,
    setOutfit,
    update(delta, movement, airborne) {
      const running = THREE.MathUtils.smoothstep(movement, .35, .85);
      actions[0].setEffectiveWeight(1 - THREE.MathUtils.smoothstep(movement, 0, .3));
      actions[1].setEffectiveWeight((1 - running) * THREE.MathUtils.smoothstep(movement, 0, .3));
      actions[2].setEffectiveWeight(running);
      actions[2].setEffectiveTimeScale(.85 + movement * .2);
      mixer.update(airborne ? delta * .25 : delta);
    }
  };
}

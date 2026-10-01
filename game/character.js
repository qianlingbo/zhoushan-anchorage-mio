import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Original facial geometry and clothing; only the underlying civilian body and
// animation skeleton come from the embedded Mixamo reference.
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
  add(new THREE.SphereGeometry(1, 36, 28), skin, [0, 0, -.008], [.101, .139, .097]);
  add(new THREE.SphereGeometry(1, 28, 20), skin, [0, -.058, .017], [.077, .073, .076]);
  for (const side of [-1, 1]) {
    add(new THREE.SphereGeometry(1, 20, 14), skin, [side * .096, -.012, -.005], [.014, .026, .014]);
    add(new THREE.SphereGeometry(1, 20, 14), skin, [side * .055, -.017, .061], [.032, .035, .031]);
    add(new THREE.SphereGeometry(1, 20, 14), eyeWhite, [side * .039, .021, .080], [.019, .0065, .007]);
    add(new THREE.SphereGeometry(1, 18, 12), iris, [side * .039, .021, .086], [.0058, .0058, .002]);
    const eyelid = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(side * .021, .020, .086),
      new THREE.Vector3(side * .037, .030, .091),
      new THREE.Vector3(side * .057, .023, .081)
    );
    add(new THREE.TubeGeometry(eyelid, 10, .0018, 5, false), skin, [0, 0, 0]);
    const brow = add(new THREE.CapsuleGeometry(.0032, .029, 4, 8), hair, [side * .039, .041, .081]);
    brow.rotation.z = side * 1.48;
  }
  add(new THREE.SphereGeometry(1, 24, 16), skin, [0, .004, .089], [.011, .031, .015]);
  add(new THREE.SphereGeometry(1, 20, 14), skin, [0, -.018, .103], [.016, .011, .013]);
  add(new THREE.SphereGeometry(1, 24, 12), lip, [0, -.061, .086], [.023, .0026, .004]);
  add(new THREE.SphereGeometry(1, 24, 12), lip, [0, -.066, .085], [.019, .0035, .004]);
  add(new THREE.SphereGeometry(.105, 32, 22, 0, Math.PI * 2, 0, Math.PI * .56), hair, [0, .034, -.015], [1, 1.07, .97]);
  // Tapered, side-parted black hair, rather than replacing only a skin tint.
  for (let index = 0; index < 7; index++) {
    const lock = add(new THREE.SphereGeometry(1, 16, 12), hair, [-.083 + index * .026, .078 + Math.sin(index * .45) * .014, .054], [.022, .038, .045]);
    lock.rotation.z = -.45;
  }
  for (const side of [-1, 1]) add(new THREE.SphereGeometry(1, 16, 12), hair, [side * .087, .011, -.031], [.015, .063, .052]);
  return head;
}

function dressPortAgent(agent, target) {
  const geometry = target.geometry;
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const skin = new THREE.Color(0xd5a57f), jacket = new THREE.Color(0x344c61);
  const trousers = new THREE.Color(0x273640), shoes = new THREE.Color(0x252a2e);
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const color = vertex.y < .095 ? shoes : vertex.y < .92 ? trousers
      : Math.abs(vertex.x) > .54 || (vertex.y > 1.28 && Math.abs(vertex.x) < .105) ? skin : jacket;
    colors.set(color.toArray(), index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const indices = geometry.index.array;
  const bodyIndices = [];
  for (let index = 0; index < indices.length; index += 3) {
    // The existing head and hairstyle are removed, not covered by another face.
    if ([indices[index], indices[index + 1], indices[index + 2]].every((vertexIndex) => position.getY(vertexIndex) < 1.375)) {
      bodyIndices.push(indices[index], indices[index + 1], indices[index + 2]);
    }
  }
  geometry.setIndex(bodyIndices);
  target.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82 });
  const mount = (boneName, object, worldPosition) => {
    const bone = agent.scene.getObjectByName(boneName);
    const transform = new THREE.Matrix4().makeTranslation(...worldPosition);
    transform.premultiply(bone.matrixWorld.clone().invert());
    object.applyMatrix4(transform); bone.add(object);
  };
  mount("mixamorigHead", makeAgentHead(), [0, 1.495, -.008]);
  const badge = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(.037, .052, .004), new THREE.MeshStandardMaterial({ color: 0xe0ddd0, roughness: .85 }));
  const cord = new THREE.Mesh(new THREE.BoxGeometry(.009, .13, .005), new THREE.MeshStandardMaterial({ color: 0x889fb1, roughness: .8 }));
  cord.position.y = .083; badge.add(card, cord);
  mount("mixamorigSpine2", badge, [0, 1.11, .086]);
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
  dressPortAgent(agent, target);
  // Preserve the civilian mesh's bind scale and proportions; transfer rotations only.
  const clips = locomotionClips(agent, locomotion, target, source, height / sourceHeight);
  const mixer = new THREE.AnimationMixer(agent.scene);
  const actions = clips.map((clip) => mixer.clipAction(clip).play());
  actions[1].setEffectiveWeight(0);
  actions[2].setEffectiveWeight(0);
  agent.scene.scale.setScalar(1.78 / height);
  mixer.update(0);
  agent.scene.updateMatrixWorld(true);
  agent.scene.position.y -= new THREE.Box3().setFromObject(agent.scene).min.y;
  return {
    object: agent.scene,
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

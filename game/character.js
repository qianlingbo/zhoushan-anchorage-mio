import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

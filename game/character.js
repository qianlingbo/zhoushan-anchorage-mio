import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function makeCharacterSurfaces() {
  const surfaces = {};
  for (const kind of ["skin", "hair", "cloth"]) {
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const noise = ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0) % 251 / 250 - .5;
      const strand = Math.sin(x * Math.PI / 2 + .18 * Math.sin(y * Math.PI / 64));
      const weave = Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2);
      const height = kind === "skin" ? 128 + noise * 28
        : kind === "hair" ? 128 + strand * 30 + Math.sin(x * Math.PI / 6.5) * 4
        : 128 + weave * 18 + Math.sin(x * Math.PI / 8) * 6;
      const roughness = kind === "skin" ? 211 + noise * 34 : kind === "hair" ? 212 + strand * 18 : 232 + weave * 12;
      pixels.set([Math.round(height), Math.round(roughness), 128, 255], (y * 128 + x) * 4);
    }
    const texture = new THREE.DataTexture(pixels, 128, 128, THREE.RGBAFormat);
    texture.name = `agent-${kind === "skin" ? "skin-grain" : kind === "hair" ? "hair-strands" : "cloth-weave"}`;
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.anisotropy = 4;
    texture.repeat.setScalar(kind === "hair" ? 1 : 2); texture.needsUpdate = true;
    surfaces[kind] = texture;
  }
  surfaces.bodyCloth = surfaces.cloth.clone(); surfaces.bodyCloth.name = "agent-cloth-body"; surfaces.bodyCloth.repeat.setScalar(16);
  surfaces.bodySkin = surfaces.skin.clone(); surfaces.bodySkin.name = "agent-skin-body"; surfaces.bodySkin.repeat.setScalar(8);
  return surfaces;
}

// Original teenage facial geometry and reshaped clothing; the civilian body
// topology and animation skeleton come from the embedded Mixamo reference.
function makeAgentHead(surfaces) {
  const head = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xd5a57f, roughness: .92, specularIntensity: .38,
    bumpMap: surfaces.skin, roughnessMap: surfaces.skin, bumpScale: .08 });
  const hair = new THREE.MeshPhysicalMaterial({ color: 0x151b20, roughness: .72, specularIntensity: .6,
    anisotropy: .35, anisotropyRotation: Math.PI / 2, bumpMap: surfaces.hair, roughnessMap: surfaces.hair, bumpScale: .24 });
  const brows = new THREE.MeshStandardMaterial({ color: 0x151b20, roughness: .9 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe9e0d1, roughness: .4 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x29221d, roughness: .42 });
  const lip = new THREE.MeshStandardMaterial({ color: 0xa26959, roughness: .75 });
  const add = (geometry, material, position, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = mesh.receiveShadow = true;
    head.add(mesh); return mesh;
  };
  const bump = (x, y, cx, cy, width, height) => Math.exp(-(((x - cx) / width) ** 2 + ((y - cy) / height) ** 2));
  const features = (x, y) => .008 * bump(x, y, 0, .012, .010, .035)
    + .014 * bump(x, y, 0, -.014, .014, .013)
    + .0035 * bump(Math.abs(x), y, .014, -.022, .006, .007)
    + .0045 * bump(Math.abs(x), y, .054, -.015, .026, .028)
    - .0025 * bump(Math.abs(x), y, .040, .024, .022, .014)
    + .005 * bump(x, y, 0, -.103, .028, .019);
  const faceFront = (x, y) => {
    const height = y / .136;
    const originalHeight = height < -.72 ? -.72 + (height + .72) / .60 : height;
    const jaw = THREE.MathUtils.clamp((-originalHeight - .35) / .65, 0, 1);
    const width = x / (.106 * (1 - .18 * jaw));
    return -.008 + .099 * Math.sqrt(Math.max(0, 1 - width ** 2 - originalHeight ** 2)) + features(x, y);
  };
  const faceGeometry = new THREE.SphereGeometry(1, 72, 64);
  const facePosition = faceGeometry.attributes.position;
  const tones = new Float32Array(facePosition.count * 3);
  for (let index = 0; index < facePosition.count; index++) {
    const originalHeight = facePosition.getY(index);
    const jaw = THREE.MathUtils.clamp((-originalHeight - .35) / .65, 0, 1);
    const x = facePosition.getX(index) * (1 - .18 * jaw);
    const y = originalHeight < -.72 ? -.72 + (originalHeight + .72) * .60 : originalHeight;
    const z = facePosition.getZ(index);
    facePosition.setXYZ(index, x, y, z + (z > 0 ? features(x * .106, y * .136) / .099 : 0));
    const warmth = z > 0 ? bump(Math.abs(x * .106), y * .136, .048, -.018, .033, .035) : 0;
    tones.set([.99 + .01 * warmth, .99 - .035 * warmth, .985 - .05 * warmth], index * 3);
  }
  faceGeometry.setAttribute("color", new THREE.BufferAttribute(tones, 3));
  faceGeometry.computeVertexNormals();
  const faceSkin = skin.clone(); faceSkin.vertexColors = true;
  add(faceGeometry, faceSkin, [0, 0, -.008], [.106, .136, .099]);
  for (const side of [-1, 1]) {
    add(new THREE.SphereGeometry(1, 20, 14), skin, [side * .101, -.010, -.005], [.014, .025, .014]);
    const eyeShape = new THREE.Shape();
    eyeShape.moveTo(-.019, 0);
    eyeShape.quadraticCurveTo(0, .010, .019, 0);
    eyeShape.quadraticCurveTo(0, -.007, -.019, 0);
    const eyeGeometry = new THREE.ShapeGeometry(eyeShape, 20);
    const eyePosition = eyeGeometry.attributes.position;
    for (let index = 0; index < eyePosition.count; index++) {
      const x = eyePosition.getX(index) + side * .040, y = eyePosition.getY(index) + .024;
      eyePosition.setXYZ(index, x, y, faceFront(x, y) + .0007);
    }
    eyeGeometry.computeVertexNormals();
    add(eyeGeometry, eyeWhite, [0, 0, 0]);
    add(new THREE.SphereGeometry(1, 18, 12), iris, [side * .040, .024, faceFront(side * .040, .024) + .0014], [.0058, .0058, .001]);
    const eyelid = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(side * .021, .024, faceFront(side * .021, .024) + .0007),
      new THREE.Vector3(side * .040, .034, faceFront(side * .040, .034) + .0007),
      new THREE.Vector3(side * .059, .024, faceFront(side * .059, .024) + .0007)
    );
    add(new THREE.TubeGeometry(eyelid, 10, .0013, 5, false), skin, [0, 0, 0]);
    const brow = add(new THREE.CapsuleGeometry(.0028, .029, 4, 8), brows, [side * .040, .045, .082]);
    brow.rotation.z = side * 1.48;
  }
  for (const upper of [true, false]) {
    const shape = new THREE.Shape();
    if (upper) {
      shape.moveTo(-.021, 0);
      shape.quadraticCurveTo(-.010, .0038, -.004, .0025);
      shape.quadraticCurveTo(0, .0012, .004, .0025);
      shape.quadraticCurveTo(.010, .0038, .021, 0);
      shape.quadraticCurveTo(0, -.0009, -.021, 0);
    } else {
      shape.moveTo(-.019, 0);
      shape.quadraticCurveTo(0, -.0045, .019, 0);
      shape.quadraticCurveTo(0, .0007, -.019, 0);
    }
    const geometry = new THREE.ShapeGeometry(shape, 20);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index), y = position.getY(index) + (upper ? -.055 : -.058);
      position.setXYZ(index, x, y, faceFront(x, y) + .0016);
    }
    geometry.computeVertexNormals();
    add(geometry, lip, [0, 0, 0]);
  }
  add(new THREE.SphereGeometry(.109, 32, 22, 0, Math.PI * 2, 0, Math.PI * .46), hair, [0, .031, -.015], [1, 1.06, .97]);
  // Tousled short black hair, softer jaw and a shorter nose distinguish the
  // teenager from the previous adult, rather than merely reducing root scale.
  for (let index = 0; index < 7; index++) {
    const lock = add(new THREE.SphereGeometry(1, 16, 12), hair, [-.087 + index * .027, .078 + Math.sin(index * 1.4) * .012, .054], [.024, .038, .046]);
    lock.rotation.z = -.32 + Math.sin(index) * .24;
  }
  for (const side of [-1, 1]) add(new THREE.SphereGeometry(1, 16, 12), hair, [side * .092, .018, -.031], [.015, .059, .052]);
  head.scale.setScalar(.93);
  return head;
}

function dressPortAgent(agent, target) {
  const surfaces = makeCharacterSurfaces();
  const geometry = target.geometry;
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const clothingParts = new Uint8Array(position.count);
  const skin = new THREE.Color(0xd5a57f), jacket = new THREE.Color(0x487b91);
  const trousers = new THREE.Color(0x394854), shoes = new THREE.Color(0xd0dce0);
  const sole = new THREE.Color(0x647680);
  const vertex = new THREE.Vector3();
  const legAxes = ["Right", "Left"].map((side) => ({
    knee: agent.scene.worldToLocal(target.skeleton.getBoneByName(`mixamorig${side}Leg`).getWorldPosition(new THREE.Vector3())),
    ankle: agent.scene.worldToLocal(target.skeleton.getBoneByName(`mixamorig${side}Foot`).getWorldPosition(new THREE.Vector3()))
  }));
  const bodyIndices = [];
  const indices = geometry.index.array;
  const headIndex = target.skeleton.bones.findIndex((bone) => bone.name === "mixamorigHead");
  const skinIndices = geometry.attributes.skinIndex.array, skinWeights = geometry.attributes.skinWeight.array;
  const originalHead = (vertexIndex) => {
    let weight = 0;
    for (let channel = 0; channel < 4; channel++) if (skinIndices[vertexIndex * 4 + channel] === headIndex) weight += skinWeights[vertexIndex * 4 + channel];
    return weight > .1;
  };
  for (let index = 0; index < indices.length; index += 3) {
    // The source jaw extends below the old height cut. Its actual head-bone
    // ownership removes those fragments without clipping shoulders or hands.
    if ([indices[index], indices[index + 1], indices[index + 2]].every((vertexIndex) => position.getY(vertexIndex) < 1.375 && !originalHead(vertexIndex))) {
      bodyIndices.push(indices[index], indices[index + 1], indices[index + 2]);
    }
  }
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const color = vertex.y < .027 ? sole : vertex.y < .105 ? shoes : vertex.y < .92 ? trousers
      : Math.abs(vertex.x) > .54 || (vertex.y > 1.325 && Math.abs(vertex.x) < .085) ? skin : jacket;
    clothingParts[index] = color === jacket ? 1 : color === trousers ? 2 : color === shoes ? 3 : 0;
    colors.set(color.toArray(), index * 3);
    const hip = Math.exp(-Math.pow((vertex.y - .87) / .16, 2));
    vertex.x *= 1 - .17 * hip;
    if (vertex.y > .105 && vertex.y < .68) {
      // Taper the source balloon trousers around each lower-leg axis, not
      // toward the body centre; shoes, knees and the rig stay unchanged.
      const axis = legAxes[vertex.x < 0 ? 0 : 1];
      const height = THREE.MathUtils.clamp((vertex.y - axis.ankle.y) / (axis.knee.y - axis.ankle.y), 0, 1);
      const centre = axis.ankle.clone().lerp(axis.knee, height);
      const taper = .55 + .45 * THREE.MathUtils.smoothstep(vertex.y, .35, .68);
      vertex.x = centre.x + (vertex.x - centre.x) * taper;
      vertex.z = centre.z + (vertex.z - centre.z) * taper;
    }
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
  const wearIndices = [], exposedIndices = [];
  for (let index = 0; index < bodyIndices.length; index += 3) {
    const triangle = bodyIndices.slice(index, index + 3);
    const skinCount = triangle.filter((vertexIndex) => !clothingParts[vertexIndex] && position.getY(vertexIndex) > .105).length;
    (skinCount >= 2 ? exposedIndices : wearIndices).push(...triangle);
  }
  geometry.setIndex([...wearIndices, ...exposedIndices]);
  geometry.clearGroups(); geometry.addGroup(0, wearIndices.length, 0); geometry.addGroup(wearIndices.length, exposedIndices.length, 1);
  geometry.computeVertexNormals();
  position.needsUpdate = true;
  target.material = [
    new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .92, specularIntensity: .3, sheen: .18,
      sheenColor: 0xffffff, sheenRoughness: .9, bumpMap: surfaces.bodyCloth, roughnessMap: surfaces.bodyCloth, bumpScale: .16 }),
    new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .92, specularIntensity: .38,
      bumpMap: surfaces.bodySkin, roughnessMap: surfaces.bodySkin, bumpScale: .08 })
  ];
  const mount = (boneName, object, worldPosition) => {
    const bone = agent.scene.getObjectByName(boneName);
    const transform = new THREE.Matrix4().makeTranslation(...worldPosition);
    transform.premultiply(bone.matrixWorld.clone().invert());
    object.applyMatrix4(transform); bone.add(object);
  };
  mount("mixamorigHead", makeAgentHead(surfaces), [0, 1.485, -.008]);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.037, .043, .09, 28, 3),
    new THREE.MeshPhysicalMaterial({ color: 0xd5a57f, roughness: .92, specularIntensity: .38,
      bumpMap: surfaces.skin, roughnessMap: surfaces.skin, bumpScale: .08 }));
  neck.name = "agent-neck"; neck.scale.z = .78;
  neck.castShadow = neck.receiveShadow = true;
  mount("mixamorigNeck", neck, [0, 1.339, -.012]);
  const hoodie = new THREE.Group();
  const cloth = new THREE.MeshPhysicalMaterial({ color: 0x487b91, roughness: .92, specularIntensity: .3, sheen: .18,
    sheenColor: 0x487b91, sheenRoughness: .9, bumpMap: surfaces.cloth, roughnessMap: surfaces.cloth, bumpScale: .16 });
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
    cloth.sheenColor.setHex(outfit.jacket);
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
    if (name === "Idle") {
      // The source idle is a staggered, twisted swagger. A planted neutral
      // stance fits quiet exploration and close-up clothing inspection.
      const times = [0, .25, .5, .75, 1].map((fraction) => fraction * reference.duration);
      const tracks = targetBones.map((bone) => {
        const rest = bind.get(bone.name);
        const relaxed = rest.quaternion.clone();
        if (["mixamorigLeftArm", "mixamorigRightArm"].includes(bone.name)) {
          const side = bone.name === "mixamorigLeftArm" ? -1 : 1;
          rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * 1.40).multiply(rest.world);
          bone.parent.getWorldQuaternion(parentRotation).invert();
          relaxed.copy(parentRotation.multiply(rotation));
        }
        const values = times.flatMap((time) => {
          const pose = relaxed.clone();
          if (bone.name === "mixamorigSpine2") pose.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(time / reference.duration * Math.PI * 2) * .006));
          return pose.toArray();
        });
        return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values);
      });
      tracks.push(new THREE.VectorKeyframeTrack(`${targetHip.name}.position`, times, times.flatMap(() => bind.get(targetHip.name).position.toArray())));
      return new THREE.AnimationClip(name, reference.duration, tracks);
    }
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

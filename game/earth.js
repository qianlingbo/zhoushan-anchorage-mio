import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const RADIUS = 1.9;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// This matches SphereGeometry's UVs and the longitude/latitude canvas texture.
export function globePosition(lat, lon, radius = RADIUS) {
  const latitude = lat * DEG, longitude = lon * DEG;
  return new THREE.Vector3(Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), -Math.cos(latitude) * Math.sin(longitude)).multiplyScalar(radius);
}

export function continentRotation(lat, lon) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(lat * DEG, -Math.PI / 2 - lon * DEG, 0, "XYZ"));
}

function polygonPath(context, rings, width, height, offset) {
  context.beginPath();
  rings.forEach((ring) => {
    let previous;
    ring.forEach(([longitude, latitude], index) => {
      let lon = longitude;
      if (previous !== undefined && Math.abs(latitude) < 89.9) {
        while (lon - previous > 180) lon -= 360;
        while (lon - previous < -180) lon += 360;
      }
      previous = lon;
      const x = (lon + 180 + offset) / 360 * width, y = (90 - latitude) / 180 * height;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.closePath();
  });
}

function smoothRange(min, max, value) {
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

function climateRegion(lat, lon, centerLat, centerLon, latRadius, lonRadius, noise) {
  const distance = ((lat - centerLat) / latRadius) ** 2 + ((lon - centerLon) / lonRadius) ** 2;
  return 1 - smoothRange(.48, 1.15, distance + noise * .14);
}

function geographyTextures(data) {
  const width = 2048, height = 1024;
  const mask = document.createElement("canvas");
  mask.width = width; mask.height = height;
  const maskContext = mask.getContext("2d", { willReadFrequently: true });
  maskContext.fillStyle = "white";
  data.features.forEach(({ geometry }) => {
    const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
    polygons.forEach((rings) => {
      [-360, 0, 360].forEach((offset) => {
        polygonPath(maskContext, rings, width, height, offset);
        maskContext.fill("evenodd");
      });
    });
  });
  const pixels = maskContext.getImageData(0, 0, width, height).data;
  const color = document.createElement("canvas"), relief = document.createElement("canvas");
  color.width = relief.width = width; color.height = relief.height = height;
  const colorContext = color.getContext("2d"), reliefContext = relief.getContext("2d");
  const image = colorContext.createImageData(width, height), elevations = reliefContext.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const latitude = 90 - y / height * 180;
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4, longitude = x / width * 360 - 180;
      const land = pixels[index + 3] / 255;
      const grain = Math.sin(x * .151 + Math.sin(y * .072) * 3) * Math.sin(y * .193 + x * .012);
      const terrain = Math.sin(longitude * .22 + Math.sin(latitude * .16) * 2) * Math.cos(latitude * .35 - longitude * .07);
      let rgb, level = 40;
      if (land > .15) {
        const ice = Math.min(1, Math.max(0, (Math.abs(latitude) - 63) / 16));
        const dry = Math.max(
          climateRegion(latitude, longitude, 24, 12, 12, 36, terrain),
          climateRegion(latitude, longitude, 25, 46, 9, 16, terrain),
          climateRegion(latitude, longitude, -25, 133, 9, 17, terrain),
          climateRegion(latitude, longitude, 42, 73, 9, 30, terrain)
        );
        const forest = Math.max(0, 1 - Math.abs(latitude) / 28);
        const forestColor = [77 - forest * 23, 112 + forest * 7, 77 - forest * 18];
        rgb = forestColor.map((channel, i) => channel * (1 - dry) + [172, 156, 108][i] * dry);
        const ridgeLatitude = 36 - (longitude - 72) * .29 + Math.sin((longitude - 75) * .13) * 1.6;
        const ridge = (1 - smoothRange(1.2, 4.4, Math.abs(latitude - ridgeLatitude) + terrain * .8))
          * smoothRange(68, 75, longitude) * (1 - smoothRange(96, 105, longitude));
        const plateau = climateRegion(latitude, longitude, 33, 88, 6, 17, terrain) * .48;
        const mountains = Math.max(ridge, plateau);
        rgb = rgb.map((channel, i) => channel * (1 - mountains * .8) + [132, 139, 125][i] * mountains * .8);
        rgb = rgb.map((channel) => channel * (1 - ice) + 210 * ice + terrain * 10 + grain * 3);
        level = 110 + terrain * 32 + grain * 8 + mountains * 45;
      } else {
        const polar = Math.abs(latitude) / 90;
        rgb = [15 + polar * 7, 67 + polar * 15, 101 + polar * 8];
        // A narrow shallow-water halo follows the actual coastline, not borders.
        const nearLand = pixels[((y * width + (x + 3) % width) * 4) + 3] || pixels[((y * width + (x + width - 3) % width) * 4) + 3] || pixels[(Math.min(height - 1, y + 3) * width + x) * 4 + 3];
        if (nearLand) rgb = [28, 101, 123];
        rgb = rgb.map((channel) => channel + grain * 1.5);
      }
      image.data[index] = rgb[0]; image.data[index + 1] = rgb[1]; image.data[index + 2] = rgb[2]; image.data[index + 3] = 255;
      elevations.data[index] = elevations.data[index + 1] = elevations.data[index + 2] = level;
      elevations.data[index + 3] = 255;
    }
  }
  colorContext.putImageData(image, 0, 0); reliefContext.putImageData(elevations, 0, 0);
  const map = new THREE.CanvasTexture(color), bumpMap = new THREE.CanvasTexture(relief);
  map.colorSpace = THREE.SRGBColorSpace;
  [map, bumpMap].forEach((texture) => { texture.wrapS = THREE.RepeatWrapping; texture.anisotropy = 4; });
  return { map, bumpMap };
}

function makeAtmosphere() {
  return new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.045, 64, 48), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 n; varying vec3 v; void main(){float rim=pow(max(0.,1.-abs(dot(normalize(n),normalize(v)))),3.2);gl_FragColor=vec4(.22,.57,.76,rim*.5);}`
  }));
}

function makeClouds() {
  return new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.012, 64, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 p; varying vec3 n; void main(){p=normalize(position);n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;varying vec3 p;varying vec3 n;
      float hash(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 q=p*7.;q.x+=time*.004;float density=noise(q)*.65+noise(q*2.7)*.25+noise(q*7.)*.1;float cloud=smoothstep(.61,.8,density);float light=.68+max(0.,dot(normalize(n),normalize(vec3(-.6,.8,1.))))*.32;gl_FragColor=vec4(vec3(.9,.95,1.)*light,cloud*.52);}`
  }));
}

function makeStars() {
  const positions = new Float32Array(660 * 3), colors = new Float32Array(660 * 3);
  let seed = 1969;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 660; i++) {
    const angle = random() * TAU, cos = random() * 2 - 1, radius = 15 + random() * 15, horizontal = Math.sqrt(1 - cos * cos);
    positions.set([Math.cos(angle) * horizontal * radius, cos * radius, Math.sin(angle) * horizontal * radius], i * 3);
    const bright = .3 + random() * .65;
    colors.set([bright * .78, bright * .88, bright], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: .036, vertexColors: true, transparent: true, opacity: .7, depthWrite: false, sizeAttenuation: true }));
}

export class EarthAtlas {
  constructor(continents) {
    this.continents = continents;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061721);
    this.camera = new THREE.PerspectiveCamera(42, 1, .1, 80);
    this.planet = new THREE.Group();
    this.scene.add(this.planet, makeStars());
    this.scene.add(new THREE.HemisphereLight(0xc2e9f2, 0x173b4d, 1.4));
    const sun = new THREE.DirectionalLight(0xffecd3, 2.5);
    sun.position.set(-3, 4, 5); this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x5aadd8, 1.5);
    rim.position.set(4, 1, -4); this.scene.add(rim);
    this.earthMaterial = new THREE.MeshStandardMaterial({ color: 0x568b86, roughness: .82, metalness: .04, bumpScale: .038 });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 128, 96), this.earthMaterial);
    this.clouds = makeClouds();
    this.planet.add(this.earth, this.clouds, makeAtmosphere());
    this.raycaster = new THREE.Raycaster();
    this.hits = [];
    this.nodes = continents.map((continent) => {
      const group = new THREE.Group(), normal = globePosition(continent.lat, continent.lon, 1);
      group.position.copy(normal).multiplyScalar(RADIUS * 1.025);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      const tint = continent.color ?? 0xf1d499;
      const ring = new THREE.Mesh(new THREE.RingGeometry(.077, .096, 48), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
      const halo = new THREE.Mesh(new THREE.RingGeometry(.128, .134, 48), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .36, side: THREE.DoubleSide, depthWrite: false }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4d9 }));
      const hit = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.userData.continent = continent.id;
      group.add(ring, halo, core, hit); this.planet.add(group); this.hits.push(hit);
      return { id: continent.id, group, normal, ring, halo, core };
    });
    const initial = continents.find((continent) => continent.id === "asia") || continents[0];
    this.targetRotation = continentRotation(initial.lat, initial.lon);
    this.planet.quaternion.copy(this.targetRotation);
    this.selected = initial.id;
    // All geography is local. No tile server, login, or external runtime request.
    this.textureReady = fetch(new URL("./assets/earth-land.geojson", import.meta.url)).then((response) => {
      if (!response.ok) throw new Error(`Earth geography: ${response.status}`);
      return response.json();
    }).then((data) => {
      Object.assign(this.earthMaterial, geographyTextures(data));
      this.earthMaterial.color.set(0xffffff);
      this.earthMaterial.needsUpdate = true;
    });
  }

  select(id) {
    const continent = this.continents.find((item) => item.id === id);
    if (!continent) return;
    this.selected = id;
    this.targetRotation.copy(continentRotation(continent.lat, continent.lon));
  }

  drag(dx, dy) {
    const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * .004, dx * .004, 0, "XYZ"));
    this.targetRotation.copy(this.planet.quaternion).premultiply(turn).normalize();
    this.planet.quaternion.copy(this.targetRotation);
  }

  pick(clientX, clientY, rect) {
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const candidates = this.raycaster.intersectObjects(this.hits);
    const visible = new Set(this.getNodeScreenPositions(rect.width, rect.height).filter((node) => node.visible).map((node) => node.id));
    return candidates.find((hit) => visible.has(hit.object.userData.continent))?.object.userData.continent || null;
  }

  getNodeScreenPositions(width, height) {
    this.scene.updateMatrixWorld(true);
    return this.nodes.map((node) => {
      const world = node.group.getWorldPosition(new THREE.Vector3());
      const normal = node.normal.clone().applyQuaternion(this.planet.quaternion);
      const front = normal.dot(this.camera.position.clone().sub(world).normalize());
      const screen = world.project(this.camera);
      return { id: node.id, x: (screen.x + 1) * width / 2, y: (1 - screen.y) * height / 2, visible: front > .14 && screen.z > -1 && screen.z < 1 };
    });
  }

  render(renderer, time, delta, width, height) {
    const mobile = width < 760;
    const shortScreen = mobile && height < 650;
    this.camera.aspect = width / height;
    const distance = shortScreen ? RADIUS / (Math.tan(21 * DEG) * .26)
      : mobile ? Math.max(8, RADIUS / (Math.tan(21 * DEG) * this.camera.aspect) * 1.27) : 8;
    this.camera.position.set(0, .2, distance);
    this.camera.lookAt(0, .2, 0); this.camera.updateProjectionMatrix();
    const planetY = shortScreen ? .2 + distance * Math.tan(21 * DEG) * .29 : mobile ? 1.42 : .12;
    this.planet.position.set(mobile ? 0 : Math.min(2, this.camera.aspect * 1.12), planetY, 0);
    this.planet.quaternion.slerp(this.targetRotation, 1 - Math.exp(-Math.min(delta, .1) * 5));
    this.clouds.rotation.y = time * .007;
    this.clouds.material.uniforms.time.value = time;
    this.nodes.forEach((node) => {
      const selected = node.id === this.selected;
      node.ring.material.opacity = selected ? .98 : .72;
      node.halo.material.opacity = selected ? .48 + Math.sin(time * 2) * .12 : .22;
      node.halo.scale.setScalar(selected ? 1.05 + Math.sin(time * 2) * .06 : 1);
      node.core.scale.setScalar(selected ? 1.25 : .9);
    });
    renderer.render(this.scene, this.camera);
  }
}

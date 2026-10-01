import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

export const natureUniforms = {
  time: { value: 0 },
  wind: { value: 1 },
  player: { value: new THREE.Vector3() }
};

const noiseGLSL = `
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise21(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);
}
float fbm(vec2 p) { return noise21(p)*.57 + noise21(p*2.03)*.28 + noise21(p*4.07)*.15; }
`;

const surfaceTextures = new Map();
export function surfaceTexture(kind) {
  if (surfaceTextures.has(kind)) return surfaceTextures.get(kind);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  const pixels = context.createImageData(128, 128);
  let seed = 91;
  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const grain = (seed / 4294967296 - .5) * (kind === "fabric" ? 18 : 32);
      const line = kind === "wood" ? Math.sin(x * .72 + Math.sin(y * .09) * 2) * 18
        : kind === "fabric" ? ((x % 3 === 0 || y % 3 === 0) ? -15 : 4) : 0;
      const shade = Math.max(0, Math.min(255, 225 + grain + line));
      const offset = (y * 128 + x) * 4;
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = shade;
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "fabric" ? 3 : 2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  surfaceTextures.set(kind, texture);
  return texture;
}

export function terrainMaterial(kind) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .94, metalness: 0,
    bumpMap: surfaceTexture("stone"), bumpScale: kind === "grass" ? .018 : .035
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGround;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGround = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vGround;\n${noiseGLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float patches = fbm(vGround.xz * .36);
        float detail = noise21(vGround.xz * 26.0);
        ${kind === "grass" ? `
          vec3 darkGrass = vec3(.07,.16,.025);
          vec3 lightGrass = vec3(.22,.34,.065);
          vec3 dryGrass = vec3(.40,.36,.12);
          vec3 groundColor = mix(darkGrass,lightGrass,smoothstep(.19,.74,patches));
          groundColor = mix(groundColor,dryGrass,smoothstep(.65,.87,patches)*.75);
        ` : kind === "sand" ? `
          vec3 groundColor = mix(vec3(.48,.39,.25),vec3(.78,.67,.44),patches);
        ` : `
          vec3 groundColor = mix(vec3(.24,.25,.22),vec3(.46,.43,.34),patches);
        `}
        diffuseColor.rgb *= groundColor * (.9 + detail * .15);
      `);
  };
  material.customProgramCacheKey = () => `natural-terrain-${kind}`;
  return material;
}

export function makeSky() {
  return new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: natureUniforms.time },
    vertexShader: `varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime; varying vec3 vDirection; ${noiseGLSL}
      void main() {
        vec3 d=normalize(vDirection); vec3 sun=normalize(vec3(-.56,.66,.48));
        float elevation=max(d.y,0.);
        vec3 color=mix(vec3(.60,.75,.83),vec3(.15,.39,.66),pow(elevation,.45));
        float glow=pow(max(dot(d,sun),0.),14.);
        color+=vec3(.14,.10,.045)*glow;
        float disc=smoothstep(.9994,.9998,dot(d,sun));
        color=mix(color,vec3(4.,3.4,2.1),disc);
        vec2 cloudUV=d.xz/(max(d.y,.08))*.75+vec2(uTime*.005,0.);
        float clouds=smoothstep(.56,.79,fbm(cloudUV*2.));
        clouds*=smoothstep(.01,.18,d.y)*(1.-smoothstep(.75,.98,d.y));
        color=mix(color,vec3(.86,.90,.90),clouds*.68);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
}

export function makeOcean(radius, centerY, scaleZ, worldScale) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 160, 112), new THREE.ShaderMaterial({
    uniforms: { uTime: natureUniforms.time, uScale: { value: worldScale } },
    vertexShader: `
      uniform float uTime; varying vec3 vWater; varying vec3 vNormal;
      void main(){
        vec3 p=position;
        float wave=sin(p.x*.7+p.z*.4+uTime*.9)*.028+sin(p.z*1.3-p.x*.24-uTime*.8)*.015;
        p+=normal*wave;
        vWater=(modelMatrix*vec4(p,1.)).xyz;
        vNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uScale; varying vec3 vWater; varying vec3 vNormal; ${noiseGLSL}
      void main(){
        vec2 p=vWater.xz;
        float wave=sin(p.x*1.6+p.y*.83+uTime)*.5+sin(p.y*2.2-p.x*.48-uTime*.7)*.3;
        vec3 n=normalize(vNormal+vec3(cos(p.x*1.6+p.y*.83+uTime)*.045,0.,cos(p.y*2.2-p.x*.48-uTime*.7)*.04));
        vec3 view=normalize(cameraPosition-vWater);
        float fresnel=pow(1.-max(dot(view,n),0.),3.);
        float coast=length(vec2(p.x,p.y/ .97619))/uScale;
        float shallow=1.-smoothstep(20.6,26.,coast);
        vec3 color=mix(vec3(.018,.17,.23),vec3(.12,.46,.45),shallow);
        color+=wave*.012;
        color=mix(color,vec3(.43,.64,.71),fresnel*.62);
        vec3 sun=normalize(vec3(-.56,.66,.48));
        float sparkle=pow(max(dot(reflect(-sun,n),view),0.),150.);
        color+=vec3(1.,.88,.61)*sparkle*1.7;
        float noise=fbm(p*.55+uTime*.07);
        float shore=21.05+sin(atan(p.y,p.x)*5.)*.28+sin(atan(p.y,p.x)*9.)*.18;
        float foam=1.-smoothstep(.035,.27,abs(coast-shore-sin(uTime*.8+noise*5.)*.22));
        color=mix(color,vec3(.82,.91,.84),foam*(.3+noise*.45));
        float haze=1.-exp(-length(cameraPosition-vWater)*.002);
        color=mix(color,vec3(.65,.77,.78),haze*.65);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  mesh.position.y = centerY;
  mesh.scale.z = scaleZ;
  return mesh;
}

function windMaterial(parameters, strength, grass = false) {
  const material = new THREE.MeshStandardMaterial(parameters);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uNatureTime: natureUniforms.time, uWind: natureUniforms.wind, uPlayer: natureUniforms.player });
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
      uniform float uNatureTime; uniform float uWind; uniform vec3 uPlayer;
      ${grass ? "varying float vBladeHeight;" : ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec4 naturePosition=vec4(position,1.);
        #ifdef USE_INSTANCING
          naturePosition=instanceMatrix*naturePosition;
        #endif
        vec3 natureWorld=(modelMatrix*naturePosition).xyz;
        float sway=sin(uNatureTime*1.7+natureWorld.x*.6+natureWorld.z*.43)*.6+sin(uNatureTime*2.6+natureWorld.z)*.4;
        transformed.x+=sway*${strength.toFixed(3)}*uWind*uv.y;
        ${grass ? `
          vBladeHeight=uv.y;
          float nearPlayer=1.-smoothstep(.3,1.25,length(natureWorld.xz-uPlayer.xz));
          transformed.y*=1.-nearPlayer*.8;
          transformed.x+=nearPlayer*uv.y*.06;
        ` : ""}
      `);
    if (grass) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vBladeHeight;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.58,.69,.42),vec3(1.08,1.13,.72),vBladeHeight);");
    }
  };
  material.customProgramCacheKey = () => `wind-${strength}-${grass}`;
  return material;
}

export function makeMeadow(frameAt, isClear, random) {
  const positions = [], uvs = [], indices = [];
  for (let blade = 0; blade < 3; blade += 1) {
    const angle = blade * 2.4, height = [.11,.15,.125][blade];
    const offsetX = Math.cos(angle) * .018, offsetZ = Math.sin(angle) * .018;
    const points = [[-.014,0,0],[.014,0,0],[-.01,height*.55,.008],[.01,height*.55,.008],[.004,height,.025]];
    points.forEach(([x,y,z]) => positions.push(x*Math.cos(angle)-z*Math.sin(angle)+offsetX,y,x*Math.sin(angle)+z*Math.cos(angle)+offsetZ));
    uvs.push(0,0,1,0,0,.55,1,.55,.5,1);
    const start = blade * 5;
    indices.push(start,start+1,start+2,start+1,start+3,start+2,start+2,start+3,start+4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = windMaterial({ color: 0xffffff, roughness: .9, side: THREE.DoubleSide }, .025, true);
  const count = window.innerWidth < 760 ? 10000 : 32000;
  const meadow = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let planted = 0;
  for (let attempt = 0; attempt < count * 5 && planted < count; attempt += 1) {
    const angle = random()*Math.PI*2;
    const radius = Math.sqrt(random())*18.55;
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius*.97619;
    if (!isClear(x,z)) continue;
    const frame = frameAt(x,z,0);
    dummy.position.copy(frame.point);
    dummy.quaternion.copy(frame.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),random()*Math.PI*2));
    const width = .75+random()*.65;
    dummy.scale.set(width,.6+random()*.55,width);
    dummy.updateMatrix();
    meadow.setMatrixAt(planted,dummy.matrix);
    color.setHSL(.22+random()*.035,.42+random()*.14,.26+random()*.08);
    meadow.setColorAt(planted,color);
    planted += 1;
  }
  meadow.count = planted;
  meadow.receiveShadow = true;
  meadow.computeBoundingSphere();
  return meadow;
}

let leafTexture;
function getLeafTexture() {
  if (leafTexture) return leafTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(32,3); ctx.bezierCurveTo(58,19,61,42,32,61); ctx.bezierCurveTo(4,43,5,20,32,3); ctx.fill();
  leafTexture = new THREE.CanvasTexture(canvas);
  return leafTexture;
}

export function makeNaturalTree(random, scale = 1, autumn = false) {
  const tree = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({color:0x69503c,roughness:.96,map:surfaceTexture("wood")});
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.085,.2,2.6,10),wood);
  trunk.position.y=1.3; trunk.castShadow=true; tree.add(trunk);
  for (let i=0;i<6;i+=1) {
    const angle=i/6*Math.PI*2+.2;
    const a=new THREE.Vector3(0,1.3+i*.15,0);
    const b=new THREE.Vector3(Math.sin(angle)*.82,2.3+i*.22,Math.cos(angle)*.82);
    const branch=new THREE.Mesh(new THREE.CylinderGeometry(.028,.08,a.distanceTo(b),7),wood);
    branch.position.copy(a).add(b).multiplyScalar(.5);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
    branch.castShadow=true; tree.add(branch);
  }
  const material=windMaterial({map:getLeafTexture(),color:0xffffff,alphaTest:.25,roughness:.85,side:THREE.DoubleSide},.045);
  const leafCount = window.innerWidth < 760 ? 1600 : 3200;
  const foliage=new THREE.InstancedMesh(new THREE.PlaneGeometry(.125,.19),material,leafCount);
  const crowns = [[-.52,2.65,-.25,.82],[.55,2.75,.15,.91],[-.18,3.42,.15,.9],[.1,2.72,-.65,.8],[.04,2.55,.6,.83]];
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  for(let i=0;i<leafCount;i+=1){
    const azimuth=random()*Math.PI*2, polar=Math.acos(2*random()-1);
    const [x,y,z,size] = crowns[i % crowns.length], outward = Math.cbrt(random());
    const radius=outward*size;
    dummy.position.set(x+Math.sin(polar)*Math.cos(azimuth)*radius,y+Math.cos(polar)*radius,z+Math.sin(polar)*Math.sin(azimuth)*radius);
    dummy.rotation.set(random()*Math.PI,random()*Math.PI*2,random()*Math.PI);
    dummy.scale.setScalar(.7+random()*.6); dummy.updateMatrix();
    foliage.setMatrixAt(i,dummy.matrix);
    color.setHSL(autumn?.075+random()*.04:.22+random()*.045,autumn?.65:.48,(autumn?.25:.19)+outward*.08+random()*.025);
    foliage.setColorAt(i,color);
  }
  foliage.castShadow=foliage.receiveShadow=true;
  tree.add(foliage); tree.scale.setScalar(scale);
  return tree;
}

// A proportioned, articulated civilian character. Knees and elbows are pivots,
// rather than rotating whole legs and arms as rigid sticks.
export function makeNaturalPerson(options, markerFactory) {
  const {jacket=0xb9653e,trousers=0x293c46,skin=0xd7a17a,hair=0x34261f,hat=false,bag=true,marker=false}=options;
  const root=new THREE.Group(),rig=new THREE.Group(); root.add(rig);
  const materials={};
  const mat=(color,fabric=false)=>{
    const key=`${color}-${fabric}`;
    if(!materials[key]) materials[key]=new THREE.MeshStandardMaterial({color,roughness:fabric?.88:.64,map:fabric?surfaceTexture("fabric"):null});
    return materials[key];
  };
  const mesh=(parent,geometry,color,position,scale=[1,1,1],fabric=false)=>{
    const object=new THREE.Mesh(geometry,mat(color,fabric));object.position.set(...position);object.scale.set(...scale);
    object.castShadow=object.receiveShadow=true;parent.add(object);return object;
  };
  const hips=mesh(rig,new THREE.SphereGeometry(1,20,12),trousers,[0,.88,0],[.21,.17,.13],true);
  const torso=new THREE.Group();torso.position.y=.96;rig.add(torso);
  mesh(torso,new THREE.SphereGeometry(1,24,16),jacket,[0,.25,0],[.25,.32,.145],true);
  mesh(torso,new THREE.CylinderGeometry(.17,.18,.15,18),jacket,[0,.015,0],[1,1,.7],true);
  mesh(torso,new THREE.BoxGeometry(.018,.44,.012),0xd8c8a4,[0,.22,.147]);
  [-1,1].forEach(side=>{
    const collar=mesh(torso,new THREE.BoxGeometry(.08,.12,.02),0xd5cdb9,[side*.061,.49,.113]);collar.rotation.z=side*.3;
    mesh(torso,new THREE.BoxGeometry(.09,.09,.025),jacket,[side*.14,.3,.129],[1,1,1],true);
  });
  mesh(rig,new THREE.CylinderGeometry(.055,.062,.12,14),skin,[0,1.52,0]);
  const head=new THREE.Group();head.position.y=1.67;rig.add(head);
  mesh(head,new THREE.SphereGeometry(1,28,20),skin,[0,0,0],[.112,.152,.113]);
  mesh(head,new THREE.SphereGeometry(1,18,12),skin,[0,-.065,.026],[.087,.08,.087]);
  [-1,1].forEach(side=>{
    mesh(head,new THREE.SphereGeometry(.022,10,8),skin,[side*.114,-.005,0],[.7,1.25,.65]);
    mesh(head,new THREE.SphereGeometry(.011,12,8),0xf6ebd9,[side*.043,.025,.099],[1.2,.6,.4]);
    mesh(head,new THREE.SphereGeometry(.0055,10,8),0x342b24,[side*.043,.025,.103]);
    const brow=mesh(head,new THREE.BoxGeometry(.032,.006,.008),hair,[side*.043,.047,.096]);brow.rotation.z=side*.08;
  });
  mesh(head,new THREE.SphereGeometry(.023,12,8),skin,[0,-.011,.112],[.55,1.3,.9]);
  mesh(head,new THREE.BoxGeometry(.036,.004,.008),0x925e4c,[0,-.068,.096]);
  mesh(head,new THREE.SphereGeometry(.116,22,16,0,Math.PI*2,0,Math.PI*.56),hair,[0,.04,-.013],[1,1.08,.94]);
  for(let i=0;i<5;i+=1){const lock=mesh(head,new THREE.SphereGeometry(.049,12,8),hair,[-.085+i*.039,.084,.075],[.7,.72,1.05]);lock.rotation.z=-.35;}
  if(hat){
    mesh(head,new THREE.SphereGeometry(.132,20,12,0,Math.PI*2,0,Math.PI/2),0xd5aa42,[0,.058,0],[1,.72,1]);
    mesh(head,new THREE.CylinderGeometry(.142,.142,.025,24),0xd5aa42,[0,.05,.014]);
  }
  const limbs={};
  [-1,1].forEach(side=>{
    const name=side<0?"left":"right";
    const arm=new THREE.Group();arm.position.set(side*.245,1.4,0);rig.add(arm);
    mesh(arm,new THREE.CapsuleGeometry(.064,.22,6,12),jacket,[side*.014,-.13,0],[1,1,.9],true);
    const elbow=new THREE.Group();elbow.position.set(side*.014,-.285,0);arm.add(elbow);
    mesh(elbow,new THREE.CapsuleGeometry(.05,.2,6,12),jacket,[0,-.115,0],[1,1,.9],true);
    mesh(elbow,new THREE.SphereGeometry(.052,14,10),skin,[0,-.265,.005],[.8,1.3,.8]);
    const leg=new THREE.Group();leg.position.set(side*.108,.88,0);rig.add(leg);
    mesh(leg,new THREE.CapsuleGeometry(.081,.28,6,14),trousers,[0,-.185,0],[1,1,.88],true);
    const knee=new THREE.Group();knee.position.set(0,-.42,0);leg.add(knee);
    mesh(knee,new THREE.CapsuleGeometry(.065,.27,6,14),trousers,[0,-.175,0],[1,1,.87],true);
    const foot=mesh(knee,new THREE.SphereGeometry(1,18,12),0x302e29,[0,-.395,.048],[.078,.053,.145]);
    mesh(knee,new THREE.BoxGeometry(.147,.025,.255),0x9a927e,[0,-.43,.04]);
    Object.assign(limbs,{[`${name}Arm`]:arm,[`${name}Elbow`]:elbow,[`${name}Leg`]:leg,[`${name}Knee`]:knee,[`${name}Foot`]:foot});
  });
  if(bag){
    mesh(torso,new THREE.SphereGeometry(1,18,12),0x746a49,[0,.2,-.18],[.19,.235,.085],true);
    [-1,1].forEach(side=>mesh(torso,new THREE.BoxGeometry(.028,.4,.025),0x393e2b,[side*.145,.24,.129]));
    mesh(torso,new THREE.BoxGeometry(.19,.095,.035),0x8f7e53,[0,.13,-.257],[1,1,1],true);
  }
  if(marker){const icon=markerFactory();icon.position.y=2.12;root.add(icon);root.userData.marker=icon;}
  Object.assign(root.userData,{rig,hips,torso,head,...limbs});
  return root;
}

export function animateNaturalPerson(person, phase, amount, time) {
  const {rig,torso,head,leftArm,rightArm,leftElbow,rightElbow,leftLeg,rightLeg,leftKnee,rightKnee,leftFoot,rightFoot}=person.userData;
  const stride=Math.sin(phase)*amount;
  rig.position.y=Math.abs(Math.cos(phase))*amount*.027+Math.sin(time*1.5)*(1-amount)*.008;
  rig.rotation.x=amount*.07;
  torso.rotation.z=-stride*.035;torso.rotation.y=-stride*.08;
  head.rotation.y=Math.sin(time*.5)*(1-amount)*.06;
  leftLeg.rotation.x=stride*.62;rightLeg.rotation.x=-stride*.62;
  leftKnee.rotation.x=Math.max(0,-Math.sin(phase))*.95*amount+.03;
  rightKnee.rotation.x=Math.max(0,Math.sin(phase))*.95*amount+.03;
  leftFoot.rotation.x=-leftKnee.rotation.x*.3;rightFoot.rotation.x=-rightKnee.rotation.x*.3;
  leftArm.rotation.x=-stride*.52;rightArm.rotation.x=stride*.52;
  leftArm.rotation.z=.06;rightArm.rotation.z=-.06;
  leftElbow.rotation.x=-.2-amount*.5;rightElbow.rotation.x=-.2-amount*.5;
}

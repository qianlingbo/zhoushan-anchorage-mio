import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// These are representative coastal destinations, not a claim that a continent
// has one climate, architectural tradition, or appearance.
export const continents = [
  {
    id: "asia", label: "亚洲", en: "Asia", lat: 30, lon: 122, color: 0xd7b564,
    description: "从舟山出发，沿秋色海岸探访港口与山间海亭。",
    climate: "temperate", heightScale: 1,
    ground: { dark: 0x24370f, light: 0x596e22, dry: 0x8b7b3b, sand: 0xc6b383 },
    landmarkName: "东海望潮亭",
    people: [
      { skin: 0xd5a57f, hair: 0x24201c, jacket: 0x39515a, trousers: 0x28333b, face: "east-asian" },
      { skin: 0xe2b990, hair: 0x29211a, jacket: 0xa7663f, trousers: 0x42464b, face: "east-asian" },
      { skin: 0xb87d55, hair: 0x181b19, jacket: 0x777d48, trousers: 0x313a42 },
      { skin: 0x76503c, hair: 0x24201f, jacket: 0x73919a, trousers: 0x333f49 }
    ]
  },
  {
    id: "europe", label: "欧洲", en: "Europe", lat: 42, lon: 15, color: 0xcac1a6,
    description: "地中海港湾的石砌钟楼、暖色屋顶与银绿树林。",
    climate: "mediterranean", heightScale: .8,
    ground: { dark: 0x3e4728, light: 0x727844, dry: 0x988352, sand: 0xd5c49a },
    landmarkName: "海港石钟楼",
    people: [
      { skin: 0xf0cbb2, hair: 0x664932, jacket: 0x486975, trousers: 0x353944 },
      { skin: 0xddab8d, hair: 0x39251e, jacket: 0x927050, trousers: 0x35434a },
      { skin: 0x8a5841, hair: 0x24221e, jacket: 0x607650, trousers: 0x303c49 },
      { skin: 0xd2a47f, hair: 0x1f211f, jacket: 0xb0654c, trousers: 0x3c4445, face: "east-asian" }
    ]
  },
  {
    id: "africa", label: "非洲", en: "Africa", lat: -4, lon: 39, color: 0xc99655,
    description: "东非海岸的金色草地、合欢树与海岸观察站。",
    climate: "savannah", heightScale: .65,
    ground: { dark: 0x67542c, light: 0x9a8348, dry: 0xc2a564, sand: 0xddc899 },
    landmarkName: "海岸生态观察站",
    people: [
      { skin: 0x623f2e, hair: 0x1e1a18, jacket: 0xa89c64, trousers: 0x3c514f },
      { skin: 0x84543a, hair: 0x241d18, jacket: 0x477b89, trousers: 0x3f4550 },
      { skin: 0x4c3026, hair: 0x1b1918, jacket: 0xbc7250, trousers: 0x384845 },
      { skin: 0xe5ba99, hair: 0x47372b, jacket: 0x6b8055, trousers: 0x354354 }
    ]
  },
  {
    id: "north-america", label: "北美洲", en: "North America", lat: 40, lon: -120, color: 0xc06f51,
    description: "太平洋海岸的红白灯塔，木栈道通向起伏的海湾。",
    climate: "temperate", heightScale: 1.15,
    ground: { dark: 0x263e23, light: 0x537244, dry: 0x898052, sand: 0xc6b695 },
    landmarkName: "太平洋红白灯塔",
    people: [
      { skin: 0xe4b797, hair: 0x49372a, jacket: 0x647c89, trousers: 0x353e4a },
      { skin: 0x82543d, hair: 0x211d1a, jacket: 0xb06c45, trousers: 0x394a4e },
      { skin: 0xc7936a, hair: 0x29201c, jacket: 0x61764c, trousers: 0x3c4545 },
      { skin: 0xe0b48e, hair: 0x222321, jacket: 0x4e7581, trousers: 0x374048, face: "east-asian" }
    ]
  },
  {
    id: "south-america", label: "南美洲", en: "South America", lat: -20, lon: -50, color: 0x66a58c,
    description: "热带海岸的棕榈、彩色院落与潮湿而丰茂的绿地。",
    climate: "tropical", heightScale: 1.1,
    ground: { dark: 0x174729, light: 0x3c7944, dry: 0x92894c, sand: 0xd6c394 },
    landmarkName: "海滨棕榈庭院",
    people: [
      { skin: 0xb47a51, hair: 0x2a201b, jacket: 0x4b8790, trousers: 0x455049 },
      { skin: 0x7b4c35, hair: 0x231d19, jacket: 0xc0834b, trousers: 0x374d50 },
      { skin: 0xe2ae89, hair: 0x4b3526, jacket: 0x849969, trousers: 0x3a4b51 },
      { skin: 0x573a2d, hair: 0x211b18, jacket: 0xb16f66, trousers: 0x354751 }
    ]
  },
  {
    id: "oceania", label: "大洋洲", en: "Oceania", lat: -25, lon: 135, color: 0xcb875b,
    description: "红色砂岩与蓝色海岸交会，沿木步道寻找远方的航标。",
    climate: "arid", heightScale: .7,
    ground: { dark: 0x72503a, light: 0xb07a50, dry: 0xc29660, sand: 0xdfc691 },
    landmarkName: "赤岩海岸步道",
    people: [
      { skin: 0x805038, hair: 0x25201c, jacket: 0x607e7b, trousers: 0x3b474e },
      { skin: 0xe4b898, hair: 0x765039, jacket: 0xa47e4e, trousers: 0x425459 },
      { skin: 0xad764d, hair: 0x29211d, jacket: 0x628652, trousers: 0x414948 },
      { skin: 0xd2a27b, hair: 0x22201d, jacket: 0x7b8892, trousers: 0x37454b, face: "east-asian" }
    ]
  },
  {
    id: "antarctica", label: "南极洲", en: "Antarctica", lat: -75, lon: 0, color: 0xaed5df,
    description: "冰雪海岸的国际科研站，极地探险者在这里相遇。",
    climate: "polar", heightScale: .75,
    ground: { dark: 0x9db8c2, light: 0xd9e5e5, dry: 0xbcd1d8, sand: 0xe7eff0 },
    landmarkName: "国际极地科研站",
    people: [
      { skin: 0xd9a982, hair: 0x211d1a, jacket: 0xcd713d, trousers: 0x3a4c5a, face: "east-asian" },
      { skin: 0x734b37, hair: 0x211e1b, jacket: 0xceaa42, trousers: 0x3c4f5c },
      { skin: 0xebc1a5, hair: 0x573e2c, jacket: 0x5d889d, trousers: 0x354757 },
      { skin: 0xaf7855, hair: 0x2e221b, jacket: 0xad5848, trousers: 0x3c4853 }
    ]
  }
];

const materials = new Map();
const palmMaterials = [0x2d6544, 0x437949].map(color => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: .8 }));
function material(color, metalness = 0) {
  const key = `${color}-${metalness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: metalness ? .45 : .85, metalness }));
  return materials.get(key);
}
function mesh(group, geometry, color, x, y, z, metalness = 0) {
  const item = new THREE.Mesh(geometry, material(color, metalness));
  item.position.set(x, y, z);
  item.castShadow = item.receiveShadow = true;
  group.add(item);
  return item;
}
function box(group, size, color, position) {
  return mesh(group, new THREE.BoxGeometry(...size), color, ...position);
}
function pole(group, a, b, radius, color) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const item = mesh(group, new THREE.CylinderGeometry(radius * .8, radius, from.distanceTo(to), 8), color, 0, 0, 0);
  item.position.copy(from).add(to).multiplyScalar(.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return item;
}
function hippedRoof(group, width, depth, y, color) {
  const roof = new THREE.BufferGeometry();
  const x = width / 2, z = depth / 2;
  roof.setAttribute("position", new THREE.Float32BufferAttribute([
    -x,y,-z, x,y,-z, 0,y+.28,0, x,y,-z, x,y,z, 0,y+.28,0,
    x,y,z, -x,y,z, 0,y+.28,0, -x,y,z, -x,y,-z, 0,y+.28,0,
    -x,y,-z, -x,y,z, x,y,z, -x,y,-z, x,y,z, x,y,-z
  ], 3));
  roof.computeVertexNormals();
  return mesh(group, roof, color, 0, 0, 0);
}

export function makeRegionLandmark(region) {
  const group = new THREE.Group();
  const stone = 0xc3b8a2, wood = 0x705440, dark = 0x344d58;
  if (region.id === "asia") {
    box(group, [1.9,.13,1.9], 0x8f968a, [0,.065,0]);
    box(group, [1.58,.11,1.58], stone, [0,.18,0]);
    for (const x of [-.63,.63]) for (const z of [-.63,.63]) {
      pole(group, [x,.22,z], [x,1.2,z], .055, 0x735744);
      box(group, [.15,.07,.15], stone, [x,.24,z]);
    }
    hippedRoof(group, 1.98, 1.98, 1.18, 0x405c5d);
    hippedRoof(group, 1.36, 1.36, 1.45, 0x405c5d);
    mesh(group, new THREE.SphereGeometry(.045,12,8), 0xc6a066, 0,1.77,0);
    for (const z of [-.66,.66]) {
      pole(group, [-.61,.54,z], [.61,.54,z], .026, wood);
      for (const x of [-.4,0,.4]) pole(group, [x,.24,z], [x,.54,z], .018, wood);
    }
    box(group, [.72,.04,.21], wood, [0,.37,-.5]);
    box(group, [.76,.05,.2], stone, [0,.025,1.01]);
  } else if (region.id === "europe") {
    box(group, [1.18,.17,1.18], 0x8a8d84, [0,.085,0]);
    box(group, [.88,1.8,.88], stone, [0,1.05,0]);
    for (const y of [.36,.68,1.04,1.44,1.84]) box(group, [.94,.036,.94], 0xaba18e, [0,y,0]);
    for (const side of [-1,1]) box(group, [.17,.31,.018], dark, [side*.22,.72,.45]);
    const clock = mesh(group, new THREE.CircleGeometry(.205,32), 0xe7dcc0, 0,1.58,.451);
    box(group, [.018,.15,.008], dark, [0,1.62,.458]);
    const hand = box(group, [.11,.016,.008], dark, [.045,1.58,.46]); hand.rotation.z=.35;
    mesh(group, new THREE.CylinderGeometry(.15,.62,.38,4), 0xa7684b, 0,2.13,0).rotation.y=Math.PI/4;
    box(group, [.42,.78,.08], 0x786954, [0,.5,.47]);
    pole(group, [0,2.31,0], [0,2.54,0], .013, dark);
    box(group, [.22,.028,.03], 0xba9a50, [.075,2.49,0]);
    clock.name = "harbor-clock";
  } else if (region.id === "africa") {
    box(group, [1.1,.1,1.05], wood, [0,.9,0]);
    for (const x of [-.43,.43]) for (const z of [-.41,.41]) pole(group, [x,0,z], [x,1.64,z], .042, 0x6b6450);
    hippedRoof(group, 1.35, 1.25, 1.65, 0xa19470);
    for (const z of [-.47,.47]) pole(group, [-.5,1.26,z], [.5,1.26,z], .022, wood);
    for (const x of [-.51,.51]) pole(group, [x,1.26,-.47], [x,1.26,.47], .022, wood);
    for (let i=0;i<7;i+=1) box(group, [.42,.055,.14], wood, [0,.1+i*.125,.92-i*.075]);
    box(group, [.21,.12,.11], dark, [.13,1.18,.22]);
    pole(group, [.13,.95,.22], [.13,1.18,.22], .018, dark);
    const shrub = createRegionalVegetation(region, () => .45, .36); shrub.position.set(-.82,0,-.35); group.add(shrub);
  } else if (region.id === "north-america") {
    mesh(group, new THREE.CylinderGeometry(.42,.54,.13,24), 0x9c9b8d, 0,.065,0);
    for (let i=0;i<5;i+=1) mesh(group, new THREE.CylinderGeometry(.32-i*.024,.344-i*.024,.31,24), i%2?0xede5d1:0xa9513e, 0,.285+i*.31,0);
    mesh(group, new THREE.CylinderGeometry(.26,.26,.07,24), dark, 0,1.83,0);
    mesh(group, new THREE.CylinderGeometry(.21,.21,.25,12), 0x8eafaf, 0,2,0);
    for(let i=0;i<6;i+=1) { const a=i*Math.PI/3; pole(group,[Math.sin(a)*.22,1.87,Math.cos(a)*.22],[Math.sin(a)*.22,2.13,Math.cos(a)*.22],.016,dark); }
    mesh(group, new THREE.ConeGeometry(.31,.22,24), 0x994b3b, 0,2.23,0);
    box(group, [.16,.32,.035], dark, [0,.34,.354]);
    box(group, [.65,.1,.65], wood, [.68,.05,.08]);
    box(group, [.51,.43,.52], 0xb5a284, [.68,.31,.08]);
    const roof=mesh(group,new THREE.CylinderGeometry(.04,.47,.22,4),0x58635f,.68,.64,.08); roof.rotation.y=Math.PI/4;
  } else if (region.id === "south-america") {
    box(group, [1.84,.08,1.62], 0xc7b68b, [0,.04,0]);
    box(group, [1.54,.69,.41], 0xdda96d, [0,.43,-.49]);
    box(group, [.4,.69,1.2], 0xcc825f, [-.57,.43,.09]);
    for (const x of [-.48,0,.48]) box(group, [.23,.3,.025], dark, [x,.45,-.27]);
    hippedRoof(group, 1.75, .65, .79, 0x955c43).position.z=-.49;
    hippedRoof(group, .65, 1.42, .79, 0x955c43).position.set(-.57,0,.09);
    mesh(group, new THREE.CylinderGeometry(.27,.28,.16,24), 0x8b9b9b, .26,.15,.21);
    mesh(group, new THREE.CircleGeometry(.22,24), 0x628f95, .26,.238,.21).rotation.x=-Math.PI/2;
    pole(group,[.26,.24,.21],[.26,.48,.21],.04,stone);
    const palm=createRegionalVegetation(region,()=>.5,.44); palm.position.set(.7,0,.48);group.add(palm);
  } else if (region.id === "oceania") {
    for(let i=0;i<11;i+=1) box(group,[1.2,.065,.17],0x998064,[0,.1,.93-i*.18]);
    for(const x of [-.55,.55]) {
      for(const z of [-.7,0,.7]) pole(group,[x,0,z],[x,.56,z],.027,wood);
      pole(group,[x,.55,-.84],[x,.55,.84],.016,0xc2b38e);
    }
    const rock=mesh(group,new THREE.DodecahedronGeometry(.56,1),0xa56846,.81,.35,-.51);rock.scale.set(.55,.84,1.05);
    const rock2=mesh(group,new THREE.IcosahedronGeometry(.37,1),0xbc855d,-.86,.21,.38);rock2.scale.set(.7,.7,1.1);
    pole(group,[0,.1,-.74],[0,1.5,-.74],.028,0xc8c9b6);
    mesh(group,new THREE.CylinderGeometry(.075,.095,.15,12),0xab5140,0,1.55,-.74);
    const sign=box(group,[.3,.15,.034],0x52737a,[.1,.98,-.74]);sign.rotation.y=.18;
  } else {
    for(const x of [-.58,.58]) for(const z of [-.38,.38]) pole(group,[x,0,z],[x,.32,z],.055,0x707b7c);
    box(group,[1.42,.66,1.06],0xd6ddd7,[0,.63,0]);
    box(group,[1.48,.06,1.1],0x577783,[0,.99,0]);
    box(group,[1.43,.17,1.07],0xb26543,[0,.35,0]);
    for(const x of [-.48,0,.48]) box(group,[.26,.19,.028],0x577d8b,[x,.7,.545]);
    box(group,[.2,.38,.035],0x566c75,[.32,.55,-.548]);
    for(let i=0;i<4;i+=1) box(group,[.33,.07,.13],0x8e9fa4,[.32,.08+i*.06,-.9+i*.07]);
    pole(group,[-.5,1,-.2],[-.5,1.67,-.2],.014,0x6c858f);
    const dish=mesh(group,new THREE.SphereGeometry(.19,18,10,0,Math.PI*2,0,Math.PI/2),0xa6b8bd,-.5,1.48,-.2);dish.rotation.z=.75;
    const ice=mesh(group,new THREE.IcosahedronGeometry(.38,1),0xc3dce1,-.88,.19,.25);ice.scale.set(.7,.7,1);
    const ice2=mesh(group,new THREE.IcosahedronGeometry(.33,0),0xe0eceb,.88,.17,-.22);ice2.scale.set(.75,.75,1.1);
  }
  group.name = `landmark-${region.id}`;
  return group;
}

export function createRegionalVegetation(region, random, scale = 1) {
  if (region.climate === "temperate") return null;
  const tree = new THREE.Group();
  if (region.climate === "savannah") {
    pole(tree,[0,0,0],[.07,1.62,0],.11,0x69513b);
    for(let i=0;i<5;i+=1) {
      const a=i*Math.PI*2/5, x=Math.cos(a)*.73,z=Math.sin(a)*.73;
      pole(tree,[.04,1.12,0],[x,1.87,z],.054,0x69513b);
      const crown=mesh(tree,new THREE.IcosahedronGeometry(.64,2),i%2?0x687844:0x52623a,x,1.94+random()*.15,z);
      crown.scale.set(1.05,.25,.9);
    }
  } else if (region.climate === "tropical") {
    const height=2.6+random()*.4;
    for(let i=0;i<7;i+=1) {
      const y=i*height/7, bend=Math.sin(i/7*1.25)*.19;
      pole(tree,[bend,y,0],[Math.sin((i+1)/7*1.25)*.19,y+height/7,0],.073-i*.004,0x80614b);
    }
    for(let i=0;i<9;i+=1) {
      const a=i*Math.PI*2/9+random()*.12, vertices=[],indices=[];
      for(let j=0;j<6;j+=1) {
        const t=j/5,r=t*1.15,width=Math.sin(t*Math.PI)*.16;
        const y=height+Math.sin(t*Math.PI)*.26-t*t*.58;
        vertices.push(.18+Math.cos(a)*r-Math.sin(a)*width,y,Math.sin(a)*r+Math.cos(a)*width,
          .18+Math.cos(a)*r+Math.sin(a)*width,y,Math.sin(a)*r-Math.cos(a)*width);
        if(j<5) {const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const frond=mesh(tree,geometry,i%2?0x437949:0x2d6544,0,0,0);
      frond.material=palmMaterials[i%2];
    }
    for(let i=0;i<3;i+=1) mesh(tree,new THREE.SphereGeometry(.075,10,8),0x65523b,.18+(i-1)*.09,height-.1,.07);
  } else if (region.climate === "mediterranean") {
    pole(tree,[0,0,0],[.08,1.65,0],.13,0x807664);
    for(let i=0;i<5;i+=1) {
      const a=i*Math.PI*2/5,x=Math.cos(a)*.5,z=Math.sin(a)*.5;
      pole(tree,[.04,.9,0],[x,1.7,z],.047,0x807664);
      const crown=mesh(tree,new THREE.IcosahedronGeometry(.62,2),i%2?0x8a9771:0x657954,x,1.8+random()*.23,z);
      crown.scale.set(1,.72,1);
    }
  } else if (region.climate === "arid") {
    const rock=mesh(tree,new THREE.DodecahedronGeometry(.44,1),0xa9714d,0,.25,0);rock.scale.set(1,.66,.85);
    for(let i=0;i<6;i+=1) {
      const a=i*Math.PI/3,x=Math.cos(a)*.34,z=Math.sin(a)*.34;
      const bush=mesh(tree,new THREE.IcosahedronGeometry(.21,1),i%2?0x83946b:0x68816a,x,.28,z);bush.scale.y=.67;
    }
  } else if (region.climate === "polar") {
    const ice=mesh(tree,new THREE.IcosahedronGeometry(.58,1),0xc9e0e4,0,.29,0);ice.scale.set(1,.57,.82);
    const cap=mesh(tree,new THREE.IcosahedronGeometry(.48,1),0xe7eff0,.04,.38,0);cap.scale.set(1,.45,.8);
  } else return null;
  tree.scale.setScalar(scale);
  return tree;
}

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const TAU = Math.PI * 2;
const ISLAND_X = 19;
const ISLAND_Z = 13.6;
const COLORS = {
  ink: 0x172c32,
  cream: 0xfffaf0,
  paper: 0xf4edda,
  sky: 0x94d5cf,
  sea: 0x63b7b4,
  seaDeep: 0x438f92,
  grass: 0x7ca96e,
  grassLight: 0xa8c77a,
  grassDark: 0x4f7956,
  sand: 0xd8c58a,
  road: 0xe8d9af,
  orange: 0xed6a45,
  yellow: 0xf0bd4d,
  blue: 0x668fa2,
  rust: 0xba7452,
  skin: 0xd9a16e,
  sunset: 0xe4a17a
};

const locations = [
  { id: "office", name: "船代办公室", short: "办公室", kind: "office", color: COLORS.yellow, position: [0, 7], interact: [1.6, 6] },
  { id: "airport", name: "普陀山机场", short: "机场", kind: "airport", color: 0xe99a58, position: [-13, 7.5], interact: [-11.5, 6.1] },
  { id: "immigration", name: "出入境边防检查站", short: "边检", kind: "immigration", color: 0xd96d55, position: [-8, 2], interact: [-6.4, 3] },
  { id: "customs", name: "舟山海关", short: "海关", kind: "customs", color: 0x7397a4, position: [-2, -1.5], interact: [-0.4, -0.3] },
  { id: "msa", name: "海事政务窗口", short: "海事", kind: "msa", color: 0x5e8ba1, position: [3, 3], interact: [4.4, 4.2] },
  { id: "shipyard", name: "船厂修造码头", short: "船厂", kind: "shipyard", color: 0xce8550, position: [12, 7], interact: [10.4, 5.7] },
  { id: "container", name: "集装箱码头", short: "集装箱", kind: "container", color: 0xe2a84f, position: [12, -3], interact: [10.3, -4.2] },
  { id: "cargo", name: "件杂货码头", short: "装卸码头", kind: "cargo", color: COLORS.rust, position: [4, -10], interact: [2.5, -8.3] },
  { id: "anchorage", name: "锚地交通艇码头", short: "锚地", kind: "anchorage", color: 0x568d91, position: [-10, -9], interact: [-8.3, -7.3] }
];

const tasks = [
  {
    destination: "airport", deadline: "08:10 前", title: "机场接班船员", description: "穿过港区去机场，确认接班船员身份和登轮安排。",
    code: "AIRPORT / 01", sceneLocation: "普陀山机场 · 到达大厅", sceneTitle: "四名接班船员已经到了",
    story: "船员带着行李在出口等候，其中一人的航班信息与预报有一点出入。车辆已经在外面催促。",
    question: "离开机场前，最稳妥的第一步是？",
    choices: ["逐一核对身份、行程、登轮名单和行李", "先上车，路上再慢慢确认", "只确认人数，证件到码头再看"],
    correct: 0, success: "核对完成。人员、证件、行李与登轮安排一致，可以安全出发。", duration: 25, energy: 4, color: "#e99a58"
  },
  {
    destination: "immigration", deadline: "09:10 前", title: "边检入境手续", description: "沿海边公路去边检窗口，带上最新船期和人员信息。",
    code: "IMMIGRATION / 02", sceneLocation: "出入境边防检查站 · 船舶窗口", sceneTitle: "实际靠泊时间又变了",
    story: "代理计划上的时间和刚收到的实际动态不一致，窗口正在等你确认。", question: "你应该怎样处理这处变化？",
    choices: ["沿用旧计划，避免多解释", "更新为实际计划并说明变化原因", "先提交，之后有空再补"],
    correct: 1, success: "变化已经说明，申报信息与实际动态一致。", duration: 35, energy: 5, color: "#d96d55"
  },
  {
    destination: "customs", deadline: "10:05 前", title: "海关物料申报", description: "去海关确认临时增加的船供物料申报。",
    code: "CUSTOMS / 03", sceneLocation: "舟山海关 · 业务窗口", sceneTitle: "供应清单临时多了两项",
    story: "供应商已经在路上，但新增物料尚未反映在原申报清单里。", question: "下一步最合适的是？",
    choices: ["先送上船，数量不大", "删掉新增项，按原单操作", "进港前更新申报并确认放行要求"],
    correct: 2, success: "清单已更新，供应安排与申报内容一致。", duration: 30, energy: 5, color: "#7397a4"
  },
  {
    destination: "shipyard", deadline: "11:20 前", title: "船厂登轮协调", description: "赶到船厂，为工程师落实通行和安全路线。",
    code: "SHIPYARD / 04", sceneLocation: "船厂 · 门岗外", sceneTitle: "工程师到了，门岗却没有记录",
    story: "现场正进行吊装作业，原定登轮路线也被临时封闭。", question: "怎样安排最稳妥？",
    choices: ["让工程师自己找船", "确认入厂权限、安全要求和替代路线", "借用别人的证件先进去"],
    correct: 1, success: "厂方确认了通行权限，并给出安全登轮路线。", duration: 40, energy: 7, color: "#ce8550"
  },
  {
    destination: "msa", deadline: "13:30 前", title: "海事文件确认", description: "回到海事窗口确认本航次文件和受理回执。",
    code: "MSA / 05", sceneLocation: "海事政务窗口 · 受理台", sceneTitle: "系统里出现了两个版本",
    story: "船方刚补发了一份文件，文件名相似，但签章时间不同。", question: "提交前首先确认什么？",
    choices: ["确认本航次要求、有效版本并留存回执", "随便选一份较大的文件", "两个版本一起传，不作说明"],
    correct: 0, success: "有效版本已经确认，受理回执也已留存。", duration: 30, energy: 4, color: "#5e8ba1"
  },
  {
    destination: "container", deadline: "14:40 前", title: "集装箱码头进场", description: "前往集装箱码头，核对预约、车辆和作业计划。",
    code: "CONTAINER / 06", sceneLocation: "集装箱码头 · 一号卡口", sceneTitle: "车辆信息和预约单差一位",
    story: "卡口排起了队，司机希望先进去再修改。", question: "此时应该怎么做？",
    choices: ["让司机跟前车混进去", "核对预约、人员、车辆和最新计划后更正", "取消今天的全部安排"],
    correct: 1, success: "信息已更正，车辆按预约顺利进场。", duration: 35, energy: 6, color: "#e2a84f"
  },
  {
    destination: "cargo", deadline: "16:05 前", title: "装卸完工确认", description: "去件杂货码头核实完工、单证与离泊条件。",
    code: "CARGO / 07", sceneLocation: "件杂货码头 · 作业平台", sceneTitle: "最后一票货正在收尾",
    story: "船长询问能否按原时间开航，但现场尚未给出最终完工确认。", question: "向船长回复前需要什么？",
    choices: ["凭经验直接保证准时", "只问吊机司机是否结束", "确认完工、货物放行和离泊手续状态"],
    correct: 2, success: "现场、单证和离泊条件均已核实，开航时间可以确认。", duration: 35, energy: 7, color: "#ba7452"
  },
  {
    destination: "anchorage", deadline: "17:20 前", title: "锚地交通艇登轮", description: "最后去交通艇码头，确认天气、船艇和会合位置。",
    code: "ANCHORAGE / 08", sceneLocation: "锚地交通艇码头 · 浮桥", sceneTitle: "风浪正在慢慢变大",
    story: "交通艇准备离岸，船方刚刚调整了锚位。", question: "解缆前最后确认什么？",
    choices: ["只要交通艇能开就出发", "确认天气、适航、救生装备和新会合点", "站在甲板上用手机找船"],
    correct: 1, success: "天气与船艇条件允许，新锚位和会合方式已经确认。", duration: 45, energy: 8, color: "#568d91"
  }
];

const $ = (id) => document.getElementById(id);
const elements = {
  intro: $("intro-screen"), play: $("play-screen"), ending: $("ending-screen"),
  titleCanvas: $("title-canvas"), worldCanvas: $("world-canvas"), endingCanvas: $("ending-canvas"), minimap: $("minimap-canvas"),
  start: $("start-button"), restart: $("restart-button"), clock: $("clock-value"), energy: $("energy-value"), completed: $("completed-value"),
  sequence: $("task-sequence"), deadline: $("task-deadline"), taskTitle: $("task-title"), description: $("task-description"), destination: $("task-destination"),
  locationHint: $("location-hint"), locationName: $("location-name"), interact: $("interact-button"), mobileAction: $("mobile-action"),
  runUp: $("run-up"), runDown: $("run-down"), runLeft: $("run-left"), runRight: $("run-right"), toast: $("toast"),
  dialog: $("scene-dialog"), sceneVisual: $("scene-visual"), sceneCode: $("scene-code"), sceneLocation: $("scene-location"),
  sceneTitle: $("scene-title"), sceneStory: $("scene-story"), sceneChoices: $("scene-choices"), sceneResult: $("scene-result"),
  resultTitle: $("result-title"), resultText: $("result-text"), complete: $("complete-button"), dialogClose: $("dialog-close"),
  help: $("help-dialog"), helpButton: $("help-button"), helpClose: $("help-close"), finalScore: $("final-score"),
  finalTime: $("final-time"), endingSummary: $("ending-summary")
};

const state = {
  mode: "intro", position: new THREE.Vector3(2.6, 0, 7), velocity: new THREE.Vector3(), facing: Math.PI,
  keys: new Set(), holds: { up: false, down: false, left: false, right: false }, taskIndex: 0, completed: 0,
  minutes: 440, energy: 100, score: 100, nearbyId: null, nearTarget: false, sceneAnswered: false,
  runPhase: 0, lastFrame: performance.now(), toastTimer: 0
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const toonMaterials = new Map();
const outlineMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });
const colliders = [];

function formatTime(total) {
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(Math.floor(total % 60)).padStart(2, "0")}`;
}

function terrainHeight(x, z) {
  const edge = Math.max(0, 1 - Math.sqrt((x / ISLAND_X) ** 2 + (z / ISLAND_Z) ** 2));
  return 0.12 + (Math.sin(x * 0.42) + Math.cos(z * 0.37) + Math.sin((x + z) * 0.24)) * 0.075 * edge;
}

function toonMaterial(color) {
  if (toonMaterials.has(color)) return toonMaterials.get(color);
  const material = new THREE.ShaderMaterial({
    uniforms: { uBase: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * worldPosition;
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBase;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      varying vec3 vWorldPosition;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDirection = normalize(vec3(-0.5, 0.85, 0.55));
        float light = dot(normal, lightDirection) * 0.5 + 0.5;
        float band = floor(light * 4.0) / 3.0;
        float rim = pow(1.0 - max(dot(normal, normalize(vViewDirection)), 0.0), 3.0);
        float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.03;
        float heightTint = clamp((vWorldPosition.y + 1.0) * 0.025, 0.0, 0.08);
        vec3 color = uBase * (0.6 + band * 0.46 + grain + heightTint) + vec3(0.07, 0.1, 0.09) * rim;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  toonMaterials.set(color, material);
  return material;
}

function addMesh(parent, geometry, color, options = {}) {
  const mesh = new THREE.Mesh(geometry, toonMaterial(color));
  const { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], outline = true, outlineScale = 1.045 } = options;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  if (outline) {
    const outline = new THREE.Mesh(geometry, outlineMaterial);
    outline.scale.setScalar(outlineScale);
    outline.renderOrder = -1;
    mesh.add(outline);
  }
  parent.add(mesh);
  return mesh;
}

function addBlobShadow(parent, width, depth, y = 0.025) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.18, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = y;
  shadow.scale.set(width, depth, 1);
  parent.add(shadow);
  return shadow;
}

function makeLabel(text, accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 112;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,250,240,.96)";
  ctx.strokeStyle = "#172c32";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(8, 8, 368, 96, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `#${new THREE.Color(accent).getHexString()}`;
  ctx.fillRect(24, 25, 10, 62);
  ctx.fillStyle = "#172c32";
  ctx.font = "900 42px 'Kaiti SC', 'STKaiti', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 204, 58);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
  sprite.scale.set(2.15, 0.63, 1);
  return sprite;
}

function makeMarker() {
  const marker = new THREE.Group();
  addMesh(marker, new THREE.ConeGeometry(0.18, 0.34, 4), COLORS.orange, { position: [0, 0.17, 0], rotation: [Math.PI, Math.PI / 4, 0] });
  addMesh(marker, new THREE.ConeGeometry(0.18, 0.34, 4), COLORS.orange, { position: [0, -0.17, 0], rotation: [0, Math.PI / 4, 0] });
  marker.visible = false;
  return marker;
}

function addWindow(group, x, y, z = 0.42) {
  addMesh(group, new THREE.BoxGeometry(0.28, 0.32, 0.05), COLORS.cream, { position: [x, y, z], outline: false });
}

function makeBuilding(location) {
  const group = new THREE.Group();
  addBlobShadow(group, 3.5, 2.4);

  if (location.kind === "airport") {
    addMesh(group, new THREE.BoxGeometry(2.8, 1.1, 1.15), location.color, { position: [0, 0.62, 0] });
    addMesh(group, new THREE.BoxGeometry(3.2, 0.13, 0.5), COLORS.cream, { position: [0, 1.26, 0.23] });
    addMesh(group, new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8), COLORS.cream, { position: [0, 1.95, 0], rotation: [0, 0, Math.PI / 2] });
    addMesh(group, new THREE.BoxGeometry(1.35, 0.08, 0.42), COLORS.cream, { position: [0, 1.95, 0], rotation: [0, 0.05, 0.18] });
    [-0.78, 0, 0.78].forEach((x) => addWindow(group, x, 0.72, 0.6));
  } else if (location.kind === "shipyard") {
    addMesh(group, new THREE.BoxGeometry(2.4, 0.78, 1.6), location.color, { position: [0, 0.44, 0] });
    addMesh(group, new THREE.BoxGeometry(0.16, 2.8, 0.16), COLORS.ink, { position: [-1.15, 1.55, 0] });
    addMesh(group, new THREE.BoxGeometry(2.5, 0.14, 0.14), COLORS.ink, { position: [0, 2.82, 0], rotation: [0, 0, -0.08] });
    addMesh(group, new THREE.BoxGeometry(0.1, 1.6, 0.1), COLORS.ink, { position: [1.08, 2.1, 0], rotation: [0, 0, -0.34] });
    addMesh(group, new THREE.BoxGeometry(0.42, 0.42, 0.42), COLORS.yellow, { position: [1.28, 1.05, 0] });
  } else if (location.kind === "container" || location.kind === "cargo") {
    const colors = [COLORS.orange, COLORS.yellow, COLORS.blue];
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        addMesh(group, new THREE.BoxGeometry(0.95, 0.52, 0.75), colors[(row + column) % 3], {
          position: [(column - 1) * 0.98, 0.3 + row * 0.53, 0]
        });
      }
    }
    if (location.kind === "cargo") {
      addMesh(group, new THREE.BoxGeometry(0.14, 2.6, 0.14), COLORS.ink, { position: [-1.75, 1.45, 0] });
      addMesh(group, new THREE.BoxGeometry(2.1, 0.14, 0.14), COLORS.ink, { position: [-0.76, 2.62, 0], rotation: [0, 0, -0.08] });
    }
  } else if (location.kind === "anchorage") {
    addMesh(group, new THREE.BoxGeometry(2.8, 0.45, 1.05), COLORS.cream, { position: [0, 0.38, 0], rotation: [0, 0, -0.04] });
    addMesh(group, new THREE.BoxGeometry(1.05, 0.72, 0.8), location.color, { position: [0.25, 0.95, 0] });
    addMesh(group, new THREE.CylinderGeometry(0.04, 0.04, 1.7, 6), COLORS.ink, { position: [0, 1.85, 0] });
    addMesh(group, new THREE.BoxGeometry(0.85, 0.08, 0.05), COLORS.orange, { position: [0.38, 2.28, 0], rotation: [0, 0, -0.2] });
  } else {
    addMesh(group, new THREE.BoxGeometry(2.15, 1.75, 1.35), location.color, { position: [0, 0.95, 0] });
    addMesh(group, new THREE.ConeGeometry(1.55, 0.72, 4), COLORS.cream, { position: [0, 2.18, 0], rotation: [0, Math.PI / 4, 0] });
    addWindow(group, -0.62, 1.15, 0.7); addWindow(group, 0.62, 1.15, 0.7);
    addMesh(group, new THREE.BoxGeometry(0.42, 0.88, 0.1), COLORS.ink, { position: [0, 0.48, 0.72], outline: false });
    if (location.kind === "office") addMesh(group, new THREE.BoxGeometry(1.25, 0.28, 0.12), COLORS.orange, { position: [0, 1.75, 0.75] });
  }
  return group;
}

function makeNpc(color) {
  const npc = new THREE.Group();
  addBlobShadow(npc, 0.85, 0.55);
  addMesh(npc, new THREE.BoxGeometry(0.48, 0.78, 0.34), color, { position: [0, 0.95, 0] });
  addMesh(npc, new THREE.SphereGeometry(0.27, 12, 8), COLORS.skin, { position: [0, 1.55, 0] });
  addMesh(npc, new THREE.SphereGeometry(0.285, 12, 8, 0, TAU, 0, Math.PI / 2), COLORS.ink, { position: [0, 1.62, -0.02], outline: false });
  addMesh(npc, new THREE.CapsuleGeometry(0.07, 0.48, 4, 8), COLORS.ink, { position: [-0.14, 0.42, 0] });
  addMesh(npc, new THREE.CapsuleGeometry(0.07, 0.48, 4, 8), COLORS.ink, { position: [0.14, 0.42, 0] });
  const marker = makeMarker();
  marker.position.y = 2.45;
  npc.add(marker);
  npc.userData.marker = marker;
  return npc;
}

function makePlayer() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  addBlobShadow(root, 0.95, 0.62);
  const body = addMesh(rig, new THREE.BoxGeometry(0.58, 0.84, 0.4), COLORS.orange, { position: [0, 1.08, 0] });
  addMesh(rig, new THREE.BoxGeometry(0.3, 0.42, 0.12), COLORS.cream, { position: [0, 1.08, 0.26], outline: false });
  addMesh(rig, new THREE.SphereGeometry(0.31, 12, 8), COLORS.skin, { position: [0, 1.8, 0] });
  addMesh(rig, new THREE.SphereGeometry(0.325, 12, 8, 0, TAU, 0, Math.PI / 2), COLORS.ink, { position: [0, 1.87, -0.02], outline: false });
  addMesh(rig, new THREE.BoxGeometry(0.48, 0.6, 0.2), COLORS.paper, { position: [0, 1.06, -0.31] });

  const limbs = {};
  ["leftArm", "rightArm"].forEach((name, index) => {
    const limb = new THREE.Group();
    limb.position.set(index ? 0.35 : -0.35, 1.38, 0);
    addMesh(limb, new THREE.CapsuleGeometry(0.085, 0.5, 4, 8), COLORS.skin, { position: [0, -0.28, 0] });
    rig.add(limb);
    limbs[name] = limb;
  });
  ["leftLeg", "rightLeg"].forEach((name, index) => {
    const limb = new THREE.Group();
    limb.position.set(index ? 0.16 : -0.16, 0.7, 0);
    addMesh(limb, new THREE.CapsuleGeometry(0.095, 0.5, 4, 8), COLORS.ink, { position: [0, -0.3, 0] });
    addMesh(limb, new THREE.BoxGeometry(0.25, 0.14, 0.42), COLORS.cream, { position: [0, -0.64, 0.1] });
    rig.add(limb);
    limbs[name] = limb;
  });
  root.userData = { rig, body, ...limbs };
  return root;
}

function makeTree(scale = 1) {
  const tree = new THREE.Group();
  addBlobShadow(tree, 1.5 * scale, 1.1 * scale);
  addMesh(tree, new THREE.CylinderGeometry(0.11 * scale, 0.16 * scale, 1.15 * scale, 7), 0x835d41, { position: [0, 0.58 * scale, 0] });
  addMesh(tree, new THREE.DodecahedronGeometry(0.62 * scale, 0), COLORS.grassDark, { position: [0, 1.42 * scale, 0] });
  addMesh(tree, new THREE.DodecahedronGeometry(0.48 * scale, 0), COLORS.grass, { position: [0.42 * scale, 1.3 * scale, 0.05] });
  return tree;
}

function makeBoat(color) {
  const boat = new THREE.Group();
  addMesh(boat, new THREE.BoxGeometry(3.4, 0.5, 1.25), COLORS.cream, { position: [0, 0.25, 0] });
  addMesh(boat, new THREE.BoxGeometry(1.3, 0.85, 1), color, { position: [0.2, 0.9, 0] });
  addMesh(boat, new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), COLORS.ink, { position: [-0.25, 2, 0] });
  addMesh(boat, new THREE.BoxGeometry(1.4, 0.08, 0.06), COLORS.orange, { position: [0.38, 2.55, 0], rotation: [0, 0, -0.18] });
  return boat;
}

class PortTownStage {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 180);
    this.renderers = new Map([
      ["intro", this.makeRenderer(elements.titleCanvas)],
      ["play", this.makeRenderer(elements.worldCanvas)],
      ["ending", this.makeRenderer(elements.endingCanvas)]
    ]);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.locationGroups = new Map();
    this.waterMaterial = null;
    this.buildWorld();
    this.player = makePlayer();
    this.world.add(this.player);
    this.targetId = "airport";
    this.camera.position.set(9, 10, 18);
    this.resize();
  }

  makeRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    return renderer;
  }

  makeTerrain(radius, color, base, scaleZ = 0.74) {
    const geometry = new THREE.CircleGeometry(radius, 72);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const localY = positions.getY(index);
      const z = -localY * scaleZ;
      const height = base + (base > 0 ? terrainHeight(x, z) : 0);
      positions.setZ(index, height);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, toonMaterial(color));
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.y = scaleZ;
    return mesh;
  }

  addRoad(points, width = 0.32) {
    const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.13, z));
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.2);
    this.world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 72, width, 7, false), toonMaterial(COLORS.road)));
  }

  buildWorld() {
    this.scene.background = new THREE.Color(COLORS.sky);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color(COLORS.sea) }, uColorB: { value: new THREE.Color(COLORS.seaDeep) } },
      vertexShader: `
        uniform float uTime;
        varying float vWave;
        void main() {
          vec3 p = position;
          float wave = sin(p.x * 0.18 + uTime) * 0.08 + cos(p.y * 0.22 - uTime * 0.8) * 0.06;
          p.z += wave;
          vWave = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vWave;
        void main() {
          float band = floor((vWave + 0.16) * 10.0) / 3.0;
          gl_FragColor = vec4(mix(uColorA, uColorB, clamp(band, 0.0, 1.0)), 1.0);
        }
      `
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 140, 42, 42), this.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.45;
    this.world.add(water);

    const islandShadow = new THREE.Mesh(
      new THREE.CircleGeometry(21, 72),
      new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.18, depthWrite: false })
    );
    islandShadow.rotation.x = -Math.PI / 2;
    islandShadow.scale.y = 0.74;
    islandShadow.position.y = -0.34;
    this.world.add(islandShadow);
    this.world.add(this.makeTerrain(20.4, COLORS.sand, -0.08));
    this.world.add(this.makeTerrain(19.2, COLORS.grass, 0.02));

    this.addRoad([[0, 7], [-6, 7], [-13, 7.5]]);
    this.addRoad([[-13, 7.5], [-10, 5], [-8, 2], [-2, -1.5], [3, 3], [8, 5], [12, 7]]);
    this.addRoad([[3, 3], [7, 0], [12, -3], [8, -7], [4, -10], [-3, -9], [-10, -9]]);
    this.addRoad([[-10, -9], [-7, -4], [-2, -1.5]]);

    const trees = [
      [-16, 4, 1.1], [-15, -1, .9], [-14, -6, 1.2], [-11, 11, .9], [-8, 9, 1], [-5, 11, 1.15],
      [-4, 4, .8], [-1, 10, 1.15], [2, 10, .9], [6, 9, 1.1], [9, 11, .95], [15, 4, 1.1],
      [16, -1, .9], [15, -7, 1.1], [11, -10, .85], [8, -12, 1], [0, -11, .95], [-5, -11, 1.1],
      [-12, -3, .8], [-7, -1, .7], [7, 6, .75], [7, -3, .7], [0, 3, .65]
    ];
    trees.forEach(([x, z, scale]) => {
      const tree = makeTree(scale);
      tree.position.set(x, terrainHeight(x, z), z);
      this.world.add(tree);
    });

    locations.forEach((location) => {
      const [x, z] = location.position;
      const group = new THREE.Group();
      const building = makeBuilding(location);
      group.add(building);
      const label = makeLabel(location.short, location.color);
      label.position.set(0, 3.55, 0);
      group.add(label);
      group.position.set(x, terrainHeight(x, z), z);
      this.world.add(group);

      const [npcX, npcZ] = location.interact;
      const npc = makeNpc(location.color);
      npc.position.set(npcX, terrainHeight(npcX, npcZ), npcZ);
      npc.rotation.y = Math.atan2(x - npcX, z - npcZ) + Math.PI;
      this.world.add(npc);
      this.locationGroups.set(location.id, { group, npc, marker: npc.userData.marker });
      colliders.push({ x, z, radius: location.kind === "container" || location.kind === "cargo" ? 2.2 : 1.75 });
    });

    const westPier = addMesh(this.world, new THREE.BoxGeometry(3.2, 0.25, 8), 0xa67a55, { position: [-10, -0.18, -15], outlineScale: 1.02 });
    westPier.rotation.y = 0.05;
    const eastPier = addMesh(this.world, new THREE.BoxGeometry(4, 0.25, 8), 0xa67a55, { position: [8, -0.18, -15], outlineScale: 1.02 });
    eastPier.rotation.y = -0.06;
    const boatA = makeBoat(COLORS.blue); boatA.position.set(-12.5, -0.2, -20); boatA.rotation.y = -0.35; this.world.add(boatA);
    const boatB = makeBoat(COLORS.orange); boatB.position.set(15, -0.2, -15); boatB.rotation.y = 0.8; this.world.add(boatB);

    [[-27, -14, 5], [27, -11, 6], [-24, 22, 4], [24, 20, 4.5]].forEach(([x, z, scale]) => {
      const distant = new THREE.Group();
      addMesh(distant, new THREE.DodecahedronGeometry(scale, 1), COLORS.grassDark, { scale: [1.4, 0.45, 1] });
      distant.position.set(x, -0.2, z);
      this.world.add(distant);
    });

    const particles = [];
    for (let index = 0; index < 150; index += 1) {
      const angle = index * 2.37;
      const radius = 8 + index % 28;
      particles.push(Math.sin(angle) * radius, 2 + (index * 17 % 80) / 10, Math.cos(angle) * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(particles, 3));
    this.airParticles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: COLORS.cream, size: 0.055, transparent: true, opacity: 0.7 }));
    this.world.add(this.airParticles);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderers.forEach((renderer) => renderer.setSize(width, height, false));
  }

  setTarget(id) {
    this.targetId = id;
    this.locationGroups.forEach((entry, locationId) => { entry.marker.visible = locationId === id; });
  }

  updatePlayer(time, movement) {
    const { rig, body, leftArm, rightArm, leftLeg, rightLeg } = this.player.userData;
    const amount = Math.min(movement, 1);
    const stride = Math.sin(state.runPhase) * amount;
    rig.position.y = amount ? Math.abs(Math.sin(state.runPhase * 2)) * 0.08 : Math.sin(time * 2) * 0.018;
    body.rotation.z = -stride * 0.07;
    leftLeg.rotation.x = stride * 0.85;
    rightLeg.rotation.x = -stride * 0.85;
    leftArm.rotation.x = -stride * 0.72;
    rightArm.rotation.x = stride * 0.72;
    this.player.rotation.y = state.facing;
    this.player.position.copy(state.position);
    this.player.position.y = terrainHeight(state.position.x, state.position.z);
  }

  render(mode, time, delta) {
    this.waterMaterial.uniforms.uTime.value = time * 0.8;
    this.airParticles.rotation.y = reducedMotion.matches ? 0 : time * 0.008;
    this.player.visible = mode === "play";
    this.scene.background.set(mode === "ending" ? COLORS.sunset : COLORS.sky);

    if (mode === "play") {
      this.updatePlayer(time, Math.min(state.velocity.length() / 5.4, 1));
      const mobile = window.innerWidth < 760;
      const offset = mobile ? new THREE.Vector3(10, 13, 18) : new THREE.Vector3(8.5, 10, 13);
      const desired = state.position.clone().add(offset);
      const cameraLerp = reducedMotion.matches ? 1 : 1 - Math.exp(-4.5 * delta);
      this.camera.position.lerp(desired, cameraLerp);
      this.camera.lookAt(state.position.x, 1.15, state.position.z);
    } else {
      const mobile = window.innerWidth < 760;
      const distance = mobile ? 54 : 39;
      const orbit = mode === "intro" ? (reducedMotion.matches ? 0.75 : 0.75 + time * 0.035) : 0.45 + time * 0.025;
      this.camera.position.set(Math.sin(orbit) * distance, mobile ? 36 : 28, Math.cos(orbit) * distance);
      this.camera.lookAt(0, 0, 0);
    }

    const marker = this.locationGroups.get(this.targetId)?.marker;
    if (marker?.visible) {
      const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(time * 5) * 0.1;
      marker.scale.setScalar(pulse);
      marker.position.y = 2.45 + (reducedMotion.matches ? 0 : Math.sin(time * 3) * 0.1);
    }
    this.renderers.get(mode).render(this.scene, this.camera);
  }
}

let stage;

function setMode(mode) {
  state.mode = mode;
  [elements.intro, elements.play, elements.ending].forEach((screen) => screen.classList.remove("is-active"));
  elements[mode].classList.add("is-active");
}

function updateHud() {
  elements.clock.textContent = formatTime(state.minutes);
  elements.energy.textContent = Math.max(0, Math.round(state.energy));
  elements.completed.textContent = state.completed;
  const task = tasks[state.taskIndex];
  if (!task) return;
  const location = locations.find((item) => item.id === task.destination);
  elements.sequence.textContent = `${String(state.taskIndex + 1).padStart(2, "0")} / ${String(tasks.length).padStart(2, "0")}`;
  elements.deadline.textContent = task.deadline;
  elements.taskTitle.textContent = task.title;
  elements.description.textContent = task.description;
  elements.destination.textContent = `下一站 · ${location.name}`;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

function resetGame() {
  state.position.set(2.6, 0, 7);
  state.velocity.set(0, 0, 0);
  state.facing = Math.PI;
  state.taskIndex = 0;
  state.completed = 0;
  state.minutes = 440;
  state.energy = 100;
  state.score = 100;
  state.nearbyId = null;
  state.nearTarget = false;
  state.sceneAnswered = false;
  state.runPhase = 0;
  state.keys.clear();
  Object.keys(state.holds).forEach((key) => { state.holds[key] = false; });
  stage.setTarget(tasks[0].destination);
  updateHud();
  setMode("play");
  showToast("沿道路前往机场，靠近发光的现场人员后交互");
}

function movementAxes() {
  const left = state.holds.left || state.keys.has("ArrowLeft") || state.keys.has("KeyA");
  const right = state.holds.right || state.keys.has("ArrowRight") || state.keys.has("KeyD");
  const up = state.holds.up || state.keys.has("ArrowUp") || state.keys.has("KeyW");
  const down = state.holds.down || state.keys.has("ArrowDown") || state.keys.has("KeyS");
  return { x: Number(right) - Number(left), z: Number(down) - Number(up) };
}

function insideIsland(x, z) {
  return (x / (ISLAND_X - 0.9)) ** 2 + (z / (ISLAND_Z - 0.9)) ** 2 < 1;
}

function collides(x, z) {
  return colliders.some((item) => Math.hypot(x - item.x, z - item.z) < item.radius + 0.48);
}

function moveCandidate(x, z) {
  if (!insideIsland(x, z) || collides(x, z)) return false;
  state.position.x = x;
  state.position.z = z;
  return true;
}

function applyMovement(direction, distance) {
  if (!direction.lengthSq()) return;
  direction.normalize();
  const nextX = state.position.x + direction.x * distance;
  const nextZ = state.position.z + direction.z * distance;
  if (!moveCandidate(nextX, nextZ)) {
    if (!moveCandidate(nextX, state.position.z)) moveCandidate(state.position.x, nextZ);
  }
  state.facing = Math.atan2(direction.x, direction.z);
}

function updateNearby() {
  let nearest = null;
  let distance = Infinity;
  locations.forEach((location) => {
    const current = Math.hypot(state.position.x - location.interact[0], state.position.z - location.interact[1]);
    if (current < distance) { nearest = location; distance = current; }
  });
  state.nearbyId = distance < 2.65 ? nearest.id : null;
  state.nearTarget = state.nearbyId === tasks[state.taskIndex]?.destination;
  elements.locationHint.hidden = !state.nearbyId;
  elements.mobileAction.classList.toggle("is-ready", state.nearTarget);
  if (state.nearbyId) elements.locationName.textContent = nearest.name;
}

function drawMinimap() {
  const canvas = elements.minimap;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const mapX = (x) => width / 2 + x / 21 * (width * 0.43);
  const mapY = (z) => height / 2 + z / 15 * (height * 0.42);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(99,183,180,.65)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(124,169,110,.88)";
  ctx.strokeStyle = "#172c32";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, width * 0.42, height * 0.39, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  const targetId = tasks[state.taskIndex]?.destination;
  locations.forEach((location) => {
    ctx.fillStyle = location.id === targetId ? "#ed6a45" : "#fffaf0";
    ctx.strokeStyle = "#172c32";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mapX(location.position[0]), mapY(location.position[1]), location.id === targetId ? 5 : 3.2, 0, TAU);
    ctx.fill(); ctx.stroke();
  });
  ctx.save();
  ctx.translate(mapX(state.position.x), mapY(state.position.z));
  ctx.rotate(-state.facing);
  ctx.fillStyle = "#f0bd4d";
  ctx.strokeStyle = "#172c32";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function interact() {
  if (state.mode !== "play" || elements.dialog.open) return;
  if (!state.nearbyId) {
    showToast("靠近现场人员或建筑后再交互");
    return;
  }
  if (!state.nearTarget) {
    const target = locations.find((item) => item.id === tasks[state.taskIndex].destination);
    showToast(`现场人员：你这一单要去 ${target.name}`);
    return;
  }
  openScene();
}

function openScene() {
  const task = tasks[state.taskIndex];
  state.velocity.set(0, 0, 0);
  state.sceneAnswered = false;
  elements.sceneVisual.style.setProperty("--scene-color", task.color);
  elements.sceneCode.textContent = task.code;
  elements.sceneLocation.textContent = task.sceneLocation;
  elements.sceneTitle.textContent = task.sceneTitle;
  elements.sceneStory.textContent = task.story;
  elements.sceneResult.hidden = true;
  elements.complete.hidden = true;
  elements.sceneChoices.innerHTML = `<legend id="scene-question">${task.question}</legend>`;
  task.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span>${choice}`;
    button.addEventListener("click", () => answerScene(index));
    elements.sceneChoices.appendChild(button);
  });
  elements.dialog.showModal();
}

function answerScene(index) {
  if (state.sceneAnswered) return;
  const task = tasks[state.taskIndex];
  state.sceneAnswered = true;
  const correct = index === task.correct;
  if (!correct) state.score = Math.max(0, state.score - 7);
  [...elements.sceneChoices.querySelectorAll("button")].forEach((button, buttonIndex) => {
    button.disabled = true;
    button.classList.toggle("is-correct", buttonIndex === task.correct);
    button.classList.toggle("is-wrong", buttonIndex === index && !correct);
  });
  elements.resultTitle.textContent = correct ? "处理稳妥 ✓" : "现场提醒";
  elements.resultText.textContent = correct ? task.success : `更稳妥的做法：${task.choices[task.correct]}。${task.success}`;
  elements.sceneResult.classList.toggle("is-warning", !correct);
  elements.sceneResult.hidden = false;
  elements.complete.hidden = false;
}

function completeTask() {
  if (!state.sceneAnswered) return;
  const task = tasks[state.taskIndex];
  elements.dialog.close();
  state.completed += 1;
  state.minutes += task.duration;
  state.energy = Math.max(12, state.energy - task.energy);
  state.taskIndex += 1;
  state.nearTarget = false;
  if (state.taskIndex >= tasks.length) {
    elements.finalScore.textContent = state.score;
    elements.finalTime.textContent = formatTime(state.minutes);
    elements.endingSummary.textContent = state.score === 100
      ? "八项任务全部办结，整座港区都跑遍了。"
      : `八项任务全部办结，专业度 ${state.score}。下次还可以跑得更稳。`;
    setMode("ending");
    return;
  }
  stage.setTarget(tasks[state.taskIndex].destination);
  updateHud();
  const next = locations.find((item) => item.id === tasks[state.taskIndex].destination);
  showToast(`办结！下一站：${next.name}`);
}

function update(delta) {
  if (state.mode !== "play" || elements.dialog.open || elements.help.open) return;
  const axes = movementAxes();
  const desired = new THREE.Vector3(axes.x, 0, axes.z);
  if (desired.lengthSq() > 1) desired.normalize();
  const targetVelocity = desired.multiplyScalar(5.4);
  state.velocity.lerp(targetVelocity, 1 - Math.exp(-10 * delta));
  if (state.velocity.lengthSq() > 0.02) {
    applyMovement(state.velocity.clone(), state.velocity.length() * delta);
    state.runPhase += state.velocity.length() * delta * 2.2;
    state.minutes += delta * 0.42;
    state.energy = Math.max(12, state.energy - delta * 0.07);
  }
  updateNearby();
  updateHud();
  drawMinimap();
}

function frame(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, 0.05);
  state.lastFrame = now;
  update(delta);
  stage?.render(state.mode, now / 1000, delta);
  requestAnimationFrame(frame);
}

function bindHold(button, direction) {
  const start = (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    state.holds[direction] = true;
    button.classList.add("is-pressed");
  };
  const stop = () => {
    state.holds[direction] = false;
    button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("lostpointercapture", stop);
}

elements.start.addEventListener("click", resetGame);
elements.restart.addEventListener("click", resetGame);
elements.interact.addEventListener("click", interact);
elements.mobileAction.addEventListener("click", interact);
elements.complete.addEventListener("click", completeTask);
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.helpButton.addEventListener("click", () => elements.help.showModal());
elements.helpClose.addEventListener("click", () => elements.help.close());
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.help.addEventListener("click", (event) => { if (event.target === elements.help) elements.help.close(); });
bindHold(elements.runUp, "up");
bindHold(elements.runDown, "down");
bindHold(elements.runLeft, "left");
bindHold(elements.runRight, "right");

const moveCodes = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
window.addEventListener("keydown", (event) => {
  if (moveCodes.includes(event.code)) {
    event.preventDefault();
    state.keys.add(event.code);
    if (!event.repeat && state.mode === "play" && !elements.dialog.open && !elements.help.open) {
      const nudge = new THREE.Vector3(
        event.code === "ArrowRight" || event.code === "KeyD" ? 1 : event.code === "ArrowLeft" || event.code === "KeyA" ? -1 : 0,
        0,
        event.code === "ArrowDown" || event.code === "KeyS" ? 1 : event.code === "ArrowUp" || event.code === "KeyW" ? -1 : 0
      );
      applyMovement(nudge, 0.38);
      state.runPhase += 0.65;
      updateNearby();
    }
  }
  if (event.code === "KeyE" && !event.repeat && !elements.dialog.open && !elements.help.open) interact();
  if (event.key === "?" && !elements.help.open) elements.help.showModal();
  if (event.code === "Escape") {
    if (elements.dialog.open) elements.dialog.close();
    if (elements.help.open) elements.help.close();
  }
});
window.addEventListener("keyup", (event) => state.keys.delete(event.code));
window.addEventListener("blur", () => {
  state.keys.clear();
  Object.keys(state.holds).forEach((key) => { state.holds[key] = false; });
});
window.addEventListener("resize", () => stage?.resize());

try {
  stage = new PortTownStage();
  stage.setTarget(tasks[0].destination);
  elements.start.disabled = false;
  elements.start.textContent = "ENTER";
  updateHud();
  drawMinimap();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  elements.start.textContent = "WEBGL 不可用";
  elements.start.disabled = true;
  elements.intro.querySelector(".intro-tip").textContent = "当前浏览器无法启动 3D 场景，请更新浏览器或开启硬件加速。";
}

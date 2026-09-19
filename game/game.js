import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const TAU = Math.PI * 2;
const PLANET_RADIUS = 5;
const PLAYER_LATITUDE = -0.39;
const COLORS = {
  ink: 0x172c32,
  paper: 0xf4edda,
  cream: 0xfffaf0,
  sea: 0x78c7c2,
  seaDark: 0x4f9998,
  mint: 0xa9ddd1,
  orange: 0xed6a45,
  yellow: 0xf0bd4d,
  green: 0x6f9d72,
  greenDark: 0x456f57,
  land: 0xd8c98e,
  blue: 0x658fa1,
  sunset: 0xe5a07a
};

const locations = [
  { id: "office", name: "船代办公室", short: "办公室", angle: 6.08, kind: "office", color: COLORS.yellow },
  { id: "airport", name: "普陀山机场", short: "机场", angle: 0.7, kind: "airport", color: 0xe99a58 },
  { id: "immigration", name: "出入境边防检查站", short: "边检", angle: 1.4, kind: "immigration", color: 0xd96d55 },
  { id: "customs", name: "舟山海关", short: "海关", angle: 2.1, kind: "customs", color: 0x7397a4 },
  { id: "shipyard", name: "船厂修造码头", short: "船厂", angle: 2.8, kind: "shipyard", color: 0xce8550 },
  { id: "msa", name: "海事政务窗口", short: "海事", angle: 3.5, kind: "msa", color: 0x5e8ba1 },
  { id: "container", name: "集装箱码头", short: "集装箱", angle: 4.2, kind: "container", color: 0xe2a84f },
  { id: "cargo", name: "件杂货码头", short: "装卸码头", angle: 4.9, kind: "cargo", color: 0xba7452 },
  { id: "anchorage", name: "锚地交通艇码头", short: "锚地", angle: 5.6, kind: "anchorage", color: 0x568d91 }
];

const tasks = [
  {
    destination: "airport", deadline: "08:10 前", title: "机场接班船员",
    description: "沿星球跑到机场，确认接班船员身份和登轮安排。",
    code: "AIRPORT / 01", sceneLocation: "普陀山机场 · 到达大厅", sceneTitle: "四名接班船员已经到了",
    story: "船员带着行李在出口等候，其中一人的航班信息与预报有一点出入。车辆已经在外面催促。",
    question: "离开机场前，最稳妥的第一步是？",
    choices: ["逐一核对身份、行程、登轮名单和行李", "先上车，路上再慢慢确认", "只确认人数，证件到码头再看"],
    correct: 0, success: "核对完成。人员、证件、行李与登轮安排一致，可以安全出发。", duration: 25, energy: 4, color: "#e99a58"
  },
  {
    destination: "immigration", deadline: "09:10 前", title: "边检入境手续",
    description: "把最新船期和人员信息带到边检窗口。",
    code: "IMMIGRATION / 02", sceneLocation: "出入境边防检查站 · 船舶窗口", sceneTitle: "实际靠泊时间又变了",
    story: "代理计划上的时间和刚收到的实际动态不一致，窗口正在等你确认。",
    question: "你应该怎样处理这处变化？",
    choices: ["沿用旧计划，避免多解释", "更新为实际计划并说明变化原因", "先提交，之后有空再补"],
    correct: 1, success: "变化已经说明，申报信息与实际动态一致。", duration: 35, energy: 5, color: "#d96d55"
  },
  {
    destination: "customs", deadline: "10:05 前", title: "海关物料申报",
    description: "船供物料临时增加，去海关确认申报信息。",
    code: "CUSTOMS / 03", sceneLocation: "舟山海关 · 业务窗口", sceneTitle: "供应清单临时多了两项",
    story: "供应商已经在路上，但新增物料尚未反映在原申报清单里。",
    question: "下一步最合适的是？",
    choices: ["先送上船，数量不大", "删掉新增项，按原单操作", "进港前更新申报并确认放行要求"],
    correct: 2, success: "清单已更新，供应安排与申报内容一致。", duration: 30, energy: 5, color: "#7397a4"
  },
  {
    destination: "shipyard", deadline: "11:20 前", title: "船厂登轮协调",
    description: "工程师要进厂登轮，先把通行和安全路线落实。",
    code: "SHIPYARD / 04", sceneLocation: "船厂 · 门岗外", sceneTitle: "工程师到了，门岗却没有记录",
    story: "现场正进行吊装作业，原定登轮路线也被临时封闭。",
    question: "怎样安排最稳妥？",
    choices: ["让工程师自己找船", "确认入厂权限、安全要求和替代路线", "借用别人的证件先进去"],
    correct: 1, success: "厂方确认了通行权限，并给出安全登轮路线。", duration: 40, energy: 7, color: "#ce8550"
  },
  {
    destination: "msa", deadline: "13:30 前", title: "海事文件确认",
    description: "去海事窗口确认本航次所需文件和回执。",
    code: "MSA / 05", sceneLocation: "海事政务窗口 · 受理台", sceneTitle: "系统里出现了两个版本",
    story: "船方刚补发了一份文件，文件名相似，但签章时间不同。",
    question: "提交前首先确认什么？",
    choices: ["确认本航次要求、有效版本并留存回执", "随便选一份较大的文件", "两个版本一起传，不作说明"],
    correct: 0, success: "有效版本已经确认，受理回执也已留存。", duration: 30, energy: 4, color: "#5e8ba1"
  },
  {
    destination: "container", deadline: "14:40 前", title: "集装箱码头进场",
    description: "核对预约、车辆与最新作业计划，带人进场。",
    code: "CONTAINER / 06", sceneLocation: "集装箱码头 · 一号卡口", sceneTitle: "车辆信息和预约单差一位",
    story: "卡口排起了队，司机希望先进去再修改。",
    question: "此时应该怎么做？",
    choices: ["让司机跟前车混进去", "核对预约、人员、车辆和最新计划后更正", "取消今天的全部安排"],
    correct: 1, success: "信息已更正，车辆按预约顺利进场。", duration: 35, energy: 6, color: "#e2a84f"
  },
  {
    destination: "cargo", deadline: "16:05 前", title: "装卸完工确认",
    description: "去件杂货码头核实完工、单证与离泊条件。",
    code: "CARGO / 07", sceneLocation: "件杂货码头 · 作业平台", sceneTitle: "最后一票货正在收尾",
    story: "船长询问能否按原时间开航，但现场尚未给出最终完工确认。",
    question: "向船长回复前需要什么？",
    choices: ["凭经验直接保证准时", "只问吊机司机是否结束", "确认完工、货物放行和离泊手续状态"],
    correct: 2, success: "现场、单证和离泊条件均已核实，开航时间可以确认。", duration: 35, energy: 7, color: "#ba7452"
  },
  {
    destination: "anchorage", deadline: "17:20 前", title: "锚地交通艇登轮",
    description: "最后一程去锚地，确认天气、船艇与会合位置。",
    code: "ANCHORAGE / 08", sceneLocation: "锚地交通艇码头 · 浮桥", sceneTitle: "风浪正在慢慢变大",
    story: "交通艇准备离岸，船方刚刚调整了锚位。",
    question: "解缆前最后确认什么？",
    choices: ["只要交通艇能开就出发", "确认天气、适航、救生装备和新会合点", "站在甲板上用手机找船"],
    correct: 1, success: "天气与船艇条件允许，新锚位和会合方式已经确认。", duration: 45, energy: 8, color: "#568d91"
  }
];

const $ = (id) => document.getElementById(id);
const elements = {
  intro: $("intro-screen"), play: $("play-screen"), ending: $("ending-screen"),
  titleCanvas: $("title-canvas"), worldCanvas: $("world-canvas"), endingCanvas: $("ending-canvas"),
  start: $("start-button"), restart: $("restart-button"), clock: $("clock-value"), energy: $("energy-value"),
  completed: $("completed-value"), sequence: $("task-sequence"), deadline: $("task-deadline"),
  taskTitle: $("task-title"), description: $("task-description"), destination: $("task-destination"),
  orbit: $("orbit-progress"), locationHint: $("location-hint"), locationName: $("location-name"),
  interact: $("interact-button"), mobileAction: $("mobile-action"), runLeft: $("run-left"), runRight: $("run-right"),
  toast: $("toast"), dialog: $("scene-dialog"), sceneVisual: $("scene-visual"), sceneCode: $("scene-code"),
  sceneLocation: $("scene-location"), sceneTitle: $("scene-title"), sceneStory: $("scene-story"),
  sceneQuestion: $("scene-question"), sceneChoices: $("scene-choices"), sceneResult: $("scene-result"),
  resultTitle: $("result-title"), resultText: $("result-text"), complete: $("complete-button"),
  dialogClose: $("dialog-close"), help: $("help-dialog"), helpButton: $("help-button"), helpClose: $("help-close"),
  finalScore: $("final-score"), finalTime: $("final-time"), endingSummary: $("ending-summary")
};

const state = {
  mode: "intro", rotation: 0, velocity: 0, direction: 1, keys: new Set(), holds: { left: false, right: false },
  taskIndex: 0, completed: 0, minutes: 440, energy: 100, score: 100, nearTarget: false,
  sceneAnswered: false, lastFrame: performance.now(), runPhase: 0, toastTimer: 0
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const materialCache = new Map();
const outlineMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });

function wrapAngle(value) {
  return ((value % TAU) + TAU) % TAU;
}

function signedAngle(value) {
  const wrapped = wrapAngle(value);
  return wrapped > Math.PI ? wrapped - TAU : wrapped;
}

function formatTime(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0")}:${String(Math.floor(totalMinutes % 60)).padStart(2, "0")}`;
}

function toonMaterial(color) {
  if (materialCache.has(color)) return materialCache.get(color);
  const material = new THREE.ShaderMaterial({
    uniforms: { uBase: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBase;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDirection = normalize(vec3(-0.45, 0.8, 0.65));
        float lightValue = dot(normal, lightDirection) * 0.5 + 0.5;
        float bands = floor(lightValue * 4.0) / 3.0;
        float rim = pow(1.0 - max(dot(normal, normalize(vViewDirection)), 0.0), 3.0);
        float grain = (noise(gl_FragCoord.xy) - 0.5) * 0.035;
        vec3 color = uBase * (0.58 + bands * 0.48 + grain) + vec3(0.08, 0.12, 0.11) * rim;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  materialCache.set(color, material);
  return material;
}

function addMesh(parent, geometry, color, options = {}) {
  const mesh = new THREE.Mesh(geometry, toonMaterial(color));
  const { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], outline = true, outlineScale = 1.055 } = options;
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

function placeOnSphere(object, longitude, latitude, radius = PLANET_RADIUS) {
  const normal = new THREE.Vector3(
    Math.sin(longitude) * Math.cos(latitude),
    Math.sin(latitude),
    Math.cos(longitude) * Math.cos(latitude)
  );
  object.position.copy(normal).multiplyScalar(radius);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return object;
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
  ctx.fillRect(24, 26, 10, 60);
  ctx.fillStyle = "#172c32";
  ctx.font = "900 42px 'Kaiti SC', 'STKaiti', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 204, 57);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
  sprite.scale.set(1.55, 0.45, 1);
  return sprite;
}

function makeMarker() {
  const marker = new THREE.Group();
  addMesh(marker, new THREE.ConeGeometry(0.17, 0.3, 4), COLORS.orange, { position: [0, 0.15, 0], rotation: [Math.PI, Math.PI / 4, 0] });
  addMesh(marker, new THREE.ConeGeometry(0.17, 0.3, 4), COLORS.orange, { position: [0, -0.15, 0], rotation: [0, Math.PI / 4, 0] });
  marker.userData.baseY = 2.5;
  marker.position.y = marker.userData.baseY;
  marker.visible = false;
  return marker;
}

function addWindow(group, x, y, z = 0.31) {
  addMesh(group, new THREE.BoxGeometry(0.22, 0.25, 0.04), COLORS.cream, { position: [x, y, z], outline: false });
}

function buildBuilding(location) {
  const group = new THREE.Group();
  addMesh(group, new THREE.CylinderGeometry(0.82, 0.9, 0.13, 8), COLORS.paper, { position: [0, 0.02, 0] });

  if (location.kind === "airport") {
    addMesh(group, new THREE.BoxGeometry(1.2, 0.62, 0.55), location.color, { position: [0, 0.38, 0] });
    addMesh(group, new THREE.BoxGeometry(1.55, 0.09, 0.28), COLORS.cream, { position: [0, 0.72, 0.12] });
    addMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 1.35, 8), COLORS.cream, { position: [0, 1.16, 0], rotation: [0, 0, Math.PI / 2] });
    addMesh(group, new THREE.BoxGeometry(0.78, 0.05, 0.22), COLORS.cream, { position: [0, 1.16, 0], rotation: [0, 0, 0.18] });
    addWindow(group, -0.35, 0.42); addWindow(group, 0, 0.42); addWindow(group, 0.35, 0.42);
  } else if (location.kind === "shipyard") {
    addMesh(group, new THREE.BoxGeometry(1.15, 0.48, 0.72), location.color, { position: [0, 0.3, 0] });
    addMesh(group, new THREE.BoxGeometry(0.1, 1.15, 0.1), COLORS.ink, { position: [-0.46, 1.05, 0] });
    addMesh(group, new THREE.BoxGeometry(1.05, 0.09, 0.09), COLORS.ink, { position: [0, 1.58, 0], rotation: [0, 0, -0.08] });
    addMesh(group, new THREE.BoxGeometry(0.06, 0.72, 0.06), COLORS.ink, { position: [0.45, 1.22, 0], rotation: [0, 0, -0.32] });
    addMesh(group, new THREE.BoxGeometry(0.24, 0.24, 0.24), COLORS.yellow, { position: [0.55, 0.72, 0] });
  } else if (location.kind === "container" || location.kind === "cargo") {
    const containerColors = [COLORS.orange, COLORS.yellow, COLORS.blue];
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        addMesh(group, new THREE.BoxGeometry(0.43, 0.28, 0.4), containerColors[(row + column) % 3], {
          position: [(column - 1) * 0.45, 0.2 + row * 0.29, 0]
        });
      }
    }
    if (location.kind === "cargo") {
      addMesh(group, new THREE.BoxGeometry(0.08, 1.15, 0.08), COLORS.ink, { position: [-0.72, 0.8, 0] });
      addMesh(group, new THREE.BoxGeometry(0.85, 0.08, 0.08), COLORS.ink, { position: [-0.32, 1.34, 0], rotation: [0, 0, -0.1] });
    }
  } else if (location.kind === "anchorage") {
    addMesh(group, new THREE.BoxGeometry(1.35, 0.22, 0.52), COLORS.cream, { position: [0, 0.25, 0], rotation: [0, 0, -0.05] });
    addMesh(group, new THREE.BoxGeometry(0.55, 0.38, 0.42), location.color, { position: [0.12, 0.53, 0] });
    addMesh(group, new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6), COLORS.ink, { position: [0, 1.02, 0] });
    addMesh(group, new THREE.BoxGeometry(0.43, 0.05, 0.03), COLORS.orange, { position: [0.2, 1.25, 0], rotation: [0, 0, -0.18] });
  } else {
    addMesh(group, new THREE.BoxGeometry(1.05, 0.95, 0.62), location.color, { position: [0, 0.55, 0] });
    addMesh(group, new THREE.ConeGeometry(0.78, 0.4, 4), COLORS.cream, { position: [0, 1.23, 0], rotation: [0, Math.PI / 4, 0] });
    addWindow(group, -0.3, 0.72); addWindow(group, 0.3, 0.72);
    addMesh(group, new THREE.BoxGeometry(0.23, 0.5, 0.08), COLORS.ink, { position: [0, 0.31, 0.34], outline: false });
    if (location.kind === "office") {
      addMesh(group, new THREE.BoxGeometry(0.66, 0.18, 0.08), COLORS.orange, { position: [0, 1.1, 0.36] });
    }
  }

  const label = makeLabel(location.short, location.color);
  label.position.set(0, 1.95, 0);
  group.add(label);
  const marker = makeMarker();
  group.add(marker);
  group.userData.marker = marker;
  return group;
}

function buildPlayer() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const body = addMesh(rig, new THREE.BoxGeometry(0.48, 0.72, 0.3), COLORS.orange, { position: [0, 1.05, 0] });
  addMesh(rig, new THREE.BoxGeometry(0.22, 0.36, 0.18), COLORS.cream, { position: [0.02, 1.07, 0.21], outline: false });
  addMesh(rig, new THREE.SphereGeometry(0.27, 12, 8), 0xd9a16e, { position: [0, 1.68, 0] });
  addMesh(rig, new THREE.SphereGeometry(0.285, 12, 8, 0, TAU, 0, Math.PI / 2), COLORS.ink, { position: [0, 1.74, -0.02], outline: false });
  const backpack = addMesh(rig, new THREE.BoxGeometry(0.42, 0.56, 0.18), COLORS.cream, { position: [-0.31, 1.08, -0.02] });
  backpack.rotation.z = 0.05;

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.29, 1.31, 0);
  rightArm.position.set(0.29, 1.31, 0);
  addMesh(leftArm, new THREE.CapsuleGeometry(0.08, 0.45, 4, 8), 0xd9a16e, { position: [0, -0.25, 0] });
  addMesh(rightArm, new THREE.CapsuleGeometry(0.08, 0.45, 4, 8), 0xd9a16e, { position: [0, -0.25, 0] });
  rig.add(leftArm, rightArm);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.72, 0);
  rightLeg.position.set(0.14, 0.72, 0);
  addMesh(leftLeg, new THREE.CapsuleGeometry(0.09, 0.48, 4, 8), COLORS.ink, { position: [0, -0.29, 0] });
  addMesh(rightLeg, new THREE.CapsuleGeometry(0.09, 0.48, 4, 8), COLORS.ink, { position: [0, -0.29, 0] });
  addMesh(leftLeg, new THREE.BoxGeometry(0.22, 0.12, 0.38), COLORS.cream, { position: [0, -0.62, 0.1] });
  addMesh(rightLeg, new THREE.BoxGeometry(0.22, 0.12, 0.38), COLORS.cream, { position: [0, -0.62, 0.1] });
  rig.add(leftLeg, rightLeg);

  root.userData = { rig, body, leftArm, rightArm, leftLeg, rightLeg };
  root.position.set(0, -1.95, 5.15);
  root.scale.setScalar(0.82);
  return root;
}

class PortPlanetStage {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 2.4, window.innerWidth < 760 ? 29.3 : 20.5);
    this.renderers = new Map([
      ["intro", this.createRenderer(elements.titleCanvas)],
      ["play", this.createRenderer(elements.worldCanvas)],
      ["ending", this.createRenderer(elements.endingCanvas)]
    ]);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.locationGroups = new Map();
    this.buildWorld();
    this.player = buildPlayer();
    this.scene.add(this.player);
    this.targetId = "airport";
    this.resize();
  }

  createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    return renderer;
  }

  buildWorld() {
    addMesh(this.world, new THREE.SphereGeometry(PLANET_RADIUS, 48, 32), COLORS.sea, { outline: true, outlineScale: 1.018 });
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_RADIUS * 1.075, 40, 28),
      new THREE.MeshBasicMaterial({ color: COLORS.mint, transparent: true, opacity: 0.17, side: THREE.BackSide })
    );
    this.scene.add(halo);

    const patchData = [
      [0.05, -0.18, 1.45, 1.1], [0.75, -0.12, 1.22, 0.9], [1.4, -0.19, 1.35, 1], [2.05, -0.1, 1.15, 0.95],
      [2.72, -0.2, 1.4, 1.1], [3.42, -0.1, 1.2, 0.94], [4.12, -0.18, 1.35, 1.03], [4.82, -0.08, 1.2, 0.94],
      [5.48, -0.2, 1.35, 1.02], [5.95, 0.2, 1.05, 0.78], [2.3, 0.32, 1.2, 0.85], [4.25, 0.35, 1.15, 0.8]
    ];
    patchData.forEach(([longitude, latitude, sx, sz], index) => {
      const patch = new THREE.Group();
      addMesh(patch, new THREE.CylinderGeometry(0.82, 0.9, 0.08, 7), index % 3 === 0 ? COLORS.green : COLORS.land, { scale: [sx, 1, sz] });
      placeOnSphere(patch, longitude, latitude, PLANET_RADIUS + 0.015);
      patch.rotateY(index * 0.41);
      this.world.add(patch);
    });

    const roadPoints = [];
    for (let index = 0; index < 96; index += 1) {
      const longitude = index / 96 * TAU;
      roadPoints.push(new THREE.Vector3(
        Math.sin(longitude) * Math.cos(PLAYER_LATITUDE) * (PLANET_RADIUS + 0.1),
        Math.sin(PLAYER_LATITUDE) * (PLANET_RADIUS + 0.1),
        Math.cos(longitude) * Math.cos(PLAYER_LATITUDE) * (PLANET_RADIUS + 0.1)
      ));
    }
    const road = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(roadPoints, true), 128, 0.055, 5, true),
      toonMaterial(COLORS.cream)
    );
    this.world.add(road);

    const nature = [
      [0.28, -0.08], [0.45, -0.34], [0.95, -0.28], [1.17, 0.05], [1.72, -0.28], [1.9, 0.1],
      [2.42, -0.32], [2.6, 0.12], [3.02, -0.05], [3.24, -0.31], [3.8, -0.25], [3.98, 0.08],
      [4.52, -0.31], [4.7, 0.12], [5.18, -0.26], [5.36, 0.02], [5.9, -0.3], [6.08, 0.08]
    ];
    nature.forEach(([longitude, latitude], index) => {
      const tree = new THREE.Group();
      addMesh(tree, new THREE.CylinderGeometry(0.045, 0.065, 0.42, 6), 0x835d41, { position: [0, 0.22, 0] });
      addMesh(tree, new THREE.DodecahedronGeometry(0.24 + index % 3 * 0.03, 0), index % 4 ? COLORS.green : COLORS.greenDark, { position: [0, 0.58, 0] });
      placeOnSphere(tree, longitude, latitude, PLANET_RADIUS + 0.08);
      this.world.add(tree);
    });

    locations.forEach((location) => {
      const group = buildBuilding(location);
      placeOnSphere(group, location.angle, PLAYER_LATITUDE, PLANET_RADIUS + 0.1);
      group.scale.setScalar(0.72);
      this.world.add(group);
      this.locationGroups.set(location.id, group);
    });

    const particleGeometry = new THREE.BufferGeometry();
    const points = [];
    for (let index = 0; index < 120; index += 1) {
      const angle = index * 12.9898;
      const radius = 9 + (index % 11) * 0.42;
      points.push(Math.sin(angle) * radius, ((index * 37) % 100) / 9 - 5.5, -5 - (index % 7));
    }
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    this.particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: COLORS.cream, size: 0.045, transparent: true, opacity: 0.62 }));
    this.scene.add(this.particles);
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
    this.locationGroups.forEach((group, locationId) => {
      group.userData.marker.visible = locationId === id;
    });
  }

  animatePlayer(time, velocity, direction) {
    const { rig, body, leftArm, rightArm, leftLeg, rightLeg } = this.player.userData;
    const movement = Math.min(Math.abs(velocity) / 0.68, 1);
    const stride = Math.sin(state.runPhase) * movement;
    rig.position.y = movement ? Math.abs(Math.sin(state.runPhase * 2)) * 0.08 : Math.sin(time * 2) * 0.02;
    rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, direction < 0 ? -0.42 : 0.42, 0.14);
    body.rotation.z = -stride * 0.08;
    leftLeg.rotation.x = stride * 0.85;
    rightLeg.rotation.x = -stride * 0.85;
    leftArm.rotation.x = -stride * 0.75;
    rightArm.rotation.x = stride * 0.75;
  }

  render(mode, time) {
    const introRotation = reducedMotion.matches ? 0.2 : time * 0.12;
    const worldRotation = mode === "intro" ? introRotation : mode === "ending" ? state.rotation + time * 0.025 : state.rotation;
    this.world.rotation.y = -worldRotation;
    this.particles.rotation.z = time * 0.008;
    this.player.visible = mode === "play";
    this.scene.background = new THREE.Color(mode === "ending" ? COLORS.sunset : COLORS.sea);

    const targetCamera = mode === "intro"
      ? new THREE.Vector3(0, 2.2, window.innerWidth < 760 ? 29.3 : 20.5)
      : mode === "ending"
        ? new THREE.Vector3(1.4, 2.6, window.innerWidth < 760 ? 29.6 : 20.8)
        : new THREE.Vector3(state.velocity * 0.55, 2.4, window.innerWidth < 760 ? 27.5 : 19.5);
    this.camera.position.lerp(targetCamera, reducedMotion.matches ? 1 : 0.075);
    this.camera.lookAt(0, mode === "play" ? -0.25 : 0.1, 0);

    if (mode === "play") this.animatePlayer(time, state.velocity, state.direction);
    const marker = this.locationGroups.get(this.targetId)?.userData.marker;
    if (marker?.visible) {
      const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(time * 5) * 0.12;
      marker.scale.setScalar(pulse);
      marker.position.y = marker.userData.baseY + (reducedMotion.matches ? 0 : Math.sin(time * 3.5) * 0.09);
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
  Object.assign(state, {
    rotation: 0, velocity: 0, direction: 1, taskIndex: 0, completed: 0, minutes: 440,
    energy: 100, score: 100, nearTarget: false, sceneAnswered: false, runPhase: 0
  });
  state.keys.clear();
  state.holds.left = false;
  state.holds.right = false;
  stage.setTarget(tasks[0].destination);
  updateHud();
  setMode("play");
  showToast("沿着星球跑，发光的橙色信标就是下一站");
}

function updateNearTarget() {
  const task = tasks[state.taskIndex];
  if (!task) return;
  const location = locations.find((item) => item.id === task.destination);
  state.nearTarget = Math.abs(signedAngle(location.angle - state.rotation)) < 0.23;
  elements.locationHint.hidden = !state.nearTarget;
  elements.mobileAction.classList.toggle("is-ready", state.nearTarget);
  elements.locationName.textContent = location.name;
}

function openScene() {
  if (state.mode !== "play" || elements.dialog.open) return;
  if (!state.nearTarget) {
    showToast("让发光信标来到人物脚下再办理");
    return;
  }
  const task = tasks[state.taskIndex];
  state.velocity = 0;
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
  elements.locationHint.hidden = true;

  if (state.taskIndex >= tasks.length) {
    elements.finalScore.textContent = state.score;
    elements.finalTime.textContent = formatTime(state.minutes);
    elements.endingSummary.textContent = state.score === 100
      ? "八项任务全部办结，所有现场判断都很稳。"
      : `八项任务全部办结，专业度 ${state.score}。下次还可以跑得更稳。`;
    setMode("ending");
    return;
  }
  stage.setTarget(tasks[state.taskIndex].destination);
  updateHud();
  const next = locations.find((item) => item.id === tasks[state.taskIndex].destination);
  showToast(`办结！下一站：${next.name}`);
}

function movementInput() {
  const left = state.holds.left || state.keys.has("ArrowLeft") || state.keys.has("KeyA");
  const right = state.holds.right || state.keys.has("ArrowRight") || state.keys.has("KeyD");
  return Number(right) - Number(left);
}

function update(delta) {
  if (state.mode !== "play" || elements.dialog.open || elements.help.open) return;
  const input = movementInput();
  const targetVelocity = input * 0.68;
  state.velocity += (targetVelocity - state.velocity) * (1 - Math.pow(0.001, delta));
  if (input) state.direction = input;
  state.rotation = wrapAngle(state.rotation + state.velocity * delta);
  state.runPhase += Math.abs(state.velocity) * delta * 13;
  if (Math.abs(state.velocity) > 0.03) {
    state.minutes += delta * 0.5;
    state.energy = Math.max(12, state.energy - delta * 0.08);
  }
  elements.orbit.style.transform = `translateY(${wrapAngle(state.rotation) / TAU * 84}%)`;
  updateNearTarget();
  updateHud();
}

function frame(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, 0.05);
  state.lastFrame = now;
  update(delta);
  stage?.render(state.mode, now / 1000);
  requestAnimationFrame(frame);
}

function bindHold(button, side) {
  const start = (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    state.holds[side] = true;
    button.classList.add("is-pressed");
  };
  const stop = () => {
    state.holds[side] = false;
    button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("lostpointercapture", stop);
}

elements.start.addEventListener("click", resetGame);
elements.restart.addEventListener("click", resetGame);
elements.interact.addEventListener("click", openScene);
elements.mobileAction.addEventListener("click", openScene);
elements.complete.addEventListener("click", completeTask);
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.helpButton.addEventListener("click", () => elements.help.showModal());
elements.helpClose.addEventListener("click", () => elements.help.close());
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.help.addEventListener("click", (event) => { if (event.target === elements.help) elements.help.close(); });
bindHold(elements.runLeft, "left");
bindHold(elements.runRight, "right");

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
    event.preventDefault();
    state.keys.add(event.code);
    if (!event.repeat && state.mode === "play" && !elements.dialog.open && !elements.help.open) {
      const step = event.code === "ArrowRight" || event.code === "KeyD" ? 0.035 : -0.035;
      state.rotation = wrapAngle(state.rotation + step);
      state.direction = Math.sign(step);
      state.runPhase += 0.8;
      updateNearTarget();
    }
  }
  if (event.code === "KeyE" && !event.repeat && !elements.dialog.open && !elements.help.open) openScene();
  if (event.key === "?" && !elements.help.open) elements.help.showModal();
  if (event.code === "Escape") {
    if (elements.dialog.open) elements.dialog.close();
    if (elements.help.open) elements.help.close();
  }
});
window.addEventListener("keyup", (event) => state.keys.delete(event.code));
window.addEventListener("blur", () => {
  state.keys.clear();
  state.holds.left = false;
  state.holds.right = false;
});
window.addEventListener("resize", () => stage?.resize());

try {
  stage = new PortPlanetStage();
  stage.setTarget(tasks[0].destination);
  elements.start.disabled = false;
  elements.start.textContent = "ENTER";
  updateHud();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  elements.start.textContent = "WEBGL 不可用";
  elements.start.disabled = true;
  elements.intro.querySelector(".intro-tip").textContent = "当前浏览器无法启动 3D 场景，请更新浏览器或开启硬件加速。";
}

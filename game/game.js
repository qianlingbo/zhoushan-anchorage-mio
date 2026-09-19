import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const TAU = Math.PI * 2;
const ISLAND_X = 21;
const ISLAND_Z = 15.5;
const PLANET_RADIUS = 34;
const PLANET_Z_SCALE = ISLAND_Z / ISLAND_X;
const PLANET_CENTER_Y = .38 - PLANET_RADIUS;
const COLORS = {
  ink: 0x172726, cream: 0xf4eddc, paper: 0xe5ddc9, sky: 0xa9bbb0,
  sea: 0x7d9991, seaDeep: 0x496662, grass: 0x829071, grassLight: 0xaeb796,
  grassDark: 0x526755, cliff: 0x837563, sand: 0xc9b98f, road: 0xd9cfb7,
  orange: 0xa9503c, yellow: 0xc49b4e, blue: 0x617b80, navy: 0x263d40,
  rust: 0x8d5846, skinA: 0xc98e68, skinB: 0xaa7157, skinC: 0xdfad82
};

const locations = [
  { id: "office", name: "船代办公室", person: "值班调度", short: "办公室", kind: "office", color: COLORS.yellow, position: [0, 8.2], interact: [2.2, 7.2] },
  { id: "airport", name: "普陀山机场", person: "接班船员", short: "机场", kind: "airport", color: 0xde8753, position: [-14.4, 8], interact: [-12.1, 6.6] },
  { id: "immigration", name: "边检船舶窗口", person: "边检民警", short: "边检", kind: "immigration", color: 0xb9574d, position: [-9.2, 2.3], interact: [-7.3, 3.1] },
  { id: "customs", name: "舟山海关", person: "海关关员", short: "海关", kind: "customs", color: 0x688795, position: [-2.2, -1.7], interact: [-0.2, -0.4] },
  { id: "msa", name: "海事政务窗口", person: "海事受理员", short: "海事", kind: "msa", color: 0x507f92, position: [3.7, 3.3], interact: [5.3, 4.6] },
  { id: "shipyard", name: "船厂修造码头", person: "船厂门岗", short: "船厂", kind: "shipyard", color: 0xb46d48, position: [13.8, 7.4], interact: [11.6, 6] },
  { id: "container", name: "集装箱码头", person: "卡口调度", short: "集装箱", kind: "container", color: 0xd99b42, position: [14, -3.1], interact: [11.6, -4.5] },
  { id: "cargo", name: "件杂货码头", person: "现场理货员", short: "装卸码头", kind: "cargo", color: COLORS.rust, position: [4.7, -11], interact: [2.8, -8.9] },
  { id: "anchorage", name: "锚地交通艇码头", person: "艇长", short: "锚地", kind: "anchorage", color: 0x4d8585, position: [-11.2, -10], interact: [-9.1, -7.9] }
];

const encounters = {
  office: [
    { title: "群里同时弹出三条船期", story: "靠泊、移泊和船员换班的时间撞在一起。司机问先去哪里，船长又发来一句“ASAP”。", question: "你先做什么？", choices: [
      ["把三个时间点画成一张现场时间线", "冲突被看见后，车辆和窗口都重新排好了顺序。", 3, 12],
      ["先回复最着急的船长", "船长安心了，但司机仍不知道下一站。", 0, 8],
      ["让每个人各自想办法", "十分钟后，所有电话又回到了你这里。", -3, 15]
    ]},
    { title: "凌晨邮件里多了一份新版附件", story: "文件名只差一个下划线，签章页却不一样。旧版已经转发给了两个人。", question: "怎么止住版本混乱？", choices: [
      ["标明有效版本并逐一撤回旧件", "收件人都确认只使用最新版本。", 3, 10],
      ["把两份都丢进群里", "大家开始问到底该用哪一份。", -2, 8],
      ["只改自己电脑里的文件名", "你的文件清楚了，其他人的仍然没变。", 0, 5]
    ]}
  ],
  airport: [
    { title: "一名船员的行李还没出来", story: "车辆在外面计时，另外三名船员已经把护照递给你。", question: "现在怎么安排？", choices: [
      ["核对全员身份并联系航司查行李", "人员和行李都有去向，车辆也拿到了新时间。", 3, 18],
      ["让三个人先走，落下的人自己打车", "分车后，登轮名单又要重新核对。", -2, 12],
      ["继续在出口等，不做确认", "时间过去了，但问题没有变少。", -1, 15]
    ]},
    { title: "船员说自己临时换了航班", story: "他本人、护照和名单都对得上，但抵达航班与预报不一致。", question: "你会相信哪一项？", choices: [
      ["同时核对登轮名单、实际航班和船方确认", "信息闭环，车辆可以出发。", 3, 12],
      ["人到了就行，其他都不重要", "窗口随后要求解释航班差异。", -2, 10],
      ["只看原来的航班截图", "截图没有告诉你眼前的人为什么在这里。", -1, 6]
    ]}
  ],
  immigration: [
    { title: "靠泊时间又往后推了两小时", story: "窗口里的计划还是上午版本，码头刚刚发来最新动态。", question: "怎样更新最稳？", choices: [
      ["用实际计划更新并说明变化原因", "窗口记录与现场动态重新一致。", 3, 15],
      ["继续沿用旧时间", "下一次核对时出现了明显矛盾。", -3, 8],
      ["先口头说一下，不留记录", "现场知道了，系统却仍然不知道。", -1, 6]
    ]},
    { title: "一名船员的证件页反光严重", story: "手机照片看不清号码，原件正在来窗口的路上。", question: "现在提交吗？", choices: [
      ["等原件并重新采集清晰信息", "号码和姓名都一次核准。", 2, 12],
      ["凭模糊照片猜一个号码", "一个字符错误让整份名单需要重做。", -4, 16],
      ["先整理其他人的材料", "等待时间没有浪费，原件随后送到。", 2, 8]
    ]}
  ],
  customs: [
    { title: "供应清单临时多了两箱备件", story: "供应车已经到港区门口，新增物料不在原申报里。", question: "你怎么处理？", choices: [
      ["进场前更新清单并确认放行要求", "物料、数量和申报内容保持一致。", 3, 16],
      ["数量不多，直接送上船", "门岗拦下车辆，时间反而更久。", -4, 14],
      ["把新增物料从单子上删掉", "纸面简单了，现场却更难解释。", -3, 8]
    ]},
    { title: "船长问免税烟酒什么时候能送", story: "供应商说半小时，码头计划却可能提前开工。", question: "你给什么答复？", choices: [
      ["同时确认供应、监管和码头时间窗", "三个环节给出了同一个可执行时间。", 3, 14],
      ["把供应商的话直接转发", "消息传到了，但责任边界仍不清楚。", 0, 5],
      ["答应一定半小时送到", "承诺比你掌握的信息快了一步。", -2, 6]
    ]}
  ],
  msa: [
    { title: "系统里出现两个同名文件", story: "补发文件与旧版只有签章时间不同，船方催你尽快提交。", question: "先确认什么？", choices: [
      ["确认本航次要求、有效版本和回执", "版本唯一，后续查询也有凭据。", 3, 13],
      ["两个版本一起传", "受理员退回材料要求说明。", -2, 10],
      ["选文件体积更大的那份", "大小没有说明文件是否有效。", -3, 6]
    ]},
    { title: "船舶动态和申报时间差了十五分钟", story: "看起来只是小差异，但它会影响后续窗口记录。", question: "要不要改？", choices: [
      ["按实际动态修正并留存来源", "时间链重新对齐。", 3, 8],
      ["十五分钟不用管", "小差异在下一个环节被放大。", -2, 5],
      ["先打电话确认变化是否稳定", "你避免了追着频繁变化反复修改。", 2, 7]
    ]}
  ],
  shipyard: [
    { title: "原定登轮路线正在吊装", story: "工程师已经到门岗，安全员要求改走另一侧舷梯。", question: "怎样带人进去？", choices: [
      ["确认权限、安全要求和替代路线", "工程师按指定路线安全登轮。", 3, 18],
      ["让工程师跟着前车混进去", "门岗立即叫停了人员。", -4, 10],
      ["只把船位发给工程师", "知道船在哪里，不等于知道怎么安全到达。", -2, 7]
    ]},
    { title: "修理项目临时增加热工作业", story: "船方希望今天完成，但许可证和监护安排都还没确认。", question: "你如何回应？", choices: [
      ["先让船厂确认许可、隔离和监护", "作业条件满足后才进入计划。", 4, 20],
      ["船长同意就可以开始", "船长的同意不能代替现场许可。", -4, 9],
      ["把要求转发给所有人等待回复", "信息到了，但还需要一个明确的协调人。", 0, 8]
    ]}
  ],
  container: [
    { title: "车牌和预约单差了一个字母", story: "卡口后面已经排起长队，司机希望先进去再改。", question: "你怎么做？", choices: [
      ["核对车辆、人员和计划后立即更正", "卡口拿到一致信息后放行。", 3, 12],
      ["让司机跟前车进去", "车辆被拦回，队伍更长了。", -4, 10],
      ["取消今天全部安排", "一个字符的问题被放大成整天的问题。", -3, 5]
    ]},
    { title: "箱位临时调整，吊机计划没同步", story: "现场说可以先干，船上却还在等新的配载信息。", question: "现在开工吗？", choices: [
      ["确认船岸计划一致后再给开工信号", "吊机和船方使用了同一份计划。", 4, 14],
      ["现场说能干就先干", "第一只箱子就暴露了计划差异。", -4, 9],
      ["只通知船长，不问码头", "船上知道变化，岸上仍按旧计划。", -2, 7]
    ]}
  ],
  cargo: [
    { title: "最后一票货还没有完工确认", story: "船长询问能否按原时间开航，吊机正在收尾。", question: "你怎样答复？", choices: [
      ["核实完工、放行和离泊手续状态", "开航时间建立在完整条件上。", 4, 16],
      ["凭经验保证准时", "经验无法替代现场的最后确认。", -3, 6],
      ["只问吊机司机是否结束", "作业结束不代表所有手续都完成。", -2, 8]
    ]},
    { title: "理货数字和大副收据不一致", story: "相差不大，但船方不愿在未核清前签字。", question: "先做哪一步？", choices: [
      ["让理货、码头和船方共同复核", "差异来源找到，三方数字一致。", 4, 18],
      ["请大副先签，明天再改", "大副拒绝签署不一致的记录。", -3, 8],
      ["取两个数字的平均值", "平均数并不是真实装卸数。", -4, 5]
    ]}
  ],
  anchorage: [
    { title: "风浪在出发前突然变大", story: "交通艇已经解下一根缆，船方又发来了新锚位。", question: "最后确认什么？", choices: [
      ["天气、适航、救生装备和新会合点", "条件允许，艇长按新位置安全出发。", 4, 15],
      ["只要艇还能开就走", "能开不等于适合安全靠近大船。", -4, 8],
      ["到了海上再用手机找船", "海面不是核对会合点的好地方。", -3, 6]
    ]},
    { title: "船方把梯口从左舷改到右舷", story: "艇长已经按原计划接近，浪涌让掉头空间变小。", question: "怎样调整？", choices: [
      ["重新确认风浪、舷侧和靠泊方式", "交通艇提前调整了接近路线。", 4, 12],
      ["到船边再临时掉头", "近距离机动让风险明显增加。", -3, 8],
      ["让船方自己想办法", "会合需要船岸双方共同确认。", -2, 5]
    ]}
  ]
};

const ambientMessages = [
  "远处汽笛响了两声，海面上的风向正在变。",
  "手机震了一下：又一条船舶动态刚刚更新。",
  "一辆集卡从路口慢慢转过，司机朝你点了点头。",
  "广播里传来靠泊提醒，港区的节奏又快了一点。",
  "海鸥掠过堆场，码头上的吊臂正在转向。"
];

const $ = (id) => document.getElementById(id);
const elements = {
  intro: $("intro-screen"), play: $("play-screen"), titleCanvas: $("title-canvas"), worldCanvas: $("world-canvas"), minimap: $("minimap-canvas"),
  start: $("start-button"), clock: $("clock-value"), trust: $("energy-value"), encountered: $("completed-value"),
  roamNote: $("mission-note"), noteKicker: $("task-sequence"), noteTime: $("task-deadline"), noteTitle: $("task-title"), noteBody: $("task-description"), noteFooter: $("task-destination"),
  locationHint: $("location-hint"), locationName: $("location-name"), interact: $("interact-button"), mobileAction: $("mobile-action"),
  runUp: $("run-up"), runDown: $("run-down"), runLeft: $("run-left"), runRight: $("run-right"), toast: $("toast"),
  viewSwitch: $("view-switch"), jumpButton: $("jump-button"),
  dialog: $("scene-dialog"), sceneVisual: $("scene-visual"), sceneCode: $("scene-code"), sceneLocation: $("scene-location"), sceneTitle: $("scene-title"),
  sceneStory: $("scene-story"), sceneChoices: $("scene-choices"), sceneResult: $("scene-result"), resultTitle: $("result-title"), resultText: $("result-text"),
  complete: $("complete-button"), dialogClose: $("dialog-close"), help: $("help-dialog"), helpButton: $("help-button"), helpClose: $("help-close")
};

const state = {
  mode: "intro", position: new THREE.Vector3(3.1, 0, 7.2), velocity: new THREE.Vector3(), facing: Math.PI,
  keys: new Set(), holds: { up: false, down: false, left: false, right: false }, minutes: 445, trust: 72, encounterCount: 0,
  nearbyId: null, activeEncounter: null, activeChoice: false, runPhase: 0, distanceWalked: 0, nextAmbientAt: 28,
  lastEncounter: new Map(), lastFrame: performance.now(), toastTimer: 0, destination: null, pendingInteractId: null,
  cameraMode: "third", cameraDistance: 7.4, cameraSnap: true, jumpHeight: 0, jumpVelocity: 0, grounded: true
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const materialCache = new Map();
const colliders = [];
const outlineMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });

function lerpAngle(from, to, amount) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * amount;
}

function seededRandom(seed = 7823) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

const random = seededRandom();

function formatTime(total) {
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(Math.floor(total % 60)).padStart(2, "0")}`;
}

function globeHeight(x, z) {
  const scaledZ = z / PLANET_Z_SCALE;
  const radialSq = x * x + scaledZ * scaledZ;
  return PLANET_CENTER_Y + Math.sqrt(Math.max(.01, PLANET_RADIUS * PLANET_RADIUS - radialSq));
}

function terrainHeight(x, z) {
  const edge = Math.max(0, 1 - Math.sqrt((x / ISLAND_X) ** 2 + (z / ISLAND_Z) ** 2));
  return globeHeight(x, z) + (Math.sin(x * 0.37) + Math.cos(z * 0.34) + Math.sin((x + z) * 0.2)) * 0.11 * edge;
}

function makeGradientMap() {
  const data = new Uint8Array([48, 112, 190, 255]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

const gradientMap = makeGradientMap();

function toonMaterial(color) {
  if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap }));
  return materialCache.get(color);
}

function addMesh(parent, geometry, color, options = {}) {
  const mesh = new THREE.Mesh(geometry, toonMaterial(color));
  const { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], outline = true, outlineScale = 1.028, shadow = true } = options;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  if (outline) {
    const outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
    outlineMesh.scale.setScalar(outlineScale);
    outlineMesh.renderOrder = -1;
    mesh.add(outlineMesh);
  }
  parent.add(mesh);
  return mesh;
}

function addBlobShadow(parent, width, depth, opacity = 0.2) {
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.035;
  shadow.scale.set(width, depth, 1);
  parent.add(shadow);
  return shadow;
}

function makeMarker(color = COLORS.yellow) {
  const group = new THREE.Group();
  addMesh(group, new THREE.OctahedronGeometry(0.16, 0), color, { outlineScale: 1.08, shadow: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.21, 0.27, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.26;
  group.add(ring);
  return group;
}

function makePerson(options = {}) {
  const { jacket = COLORS.orange, trousers = COLORS.navy, skin = COLORS.skinA, hair = 0x302b29, bag = true, hat = false, marker = false } = options;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  addBlobShadow(root, 0.95, 0.58, 0.24);
  const hips = addMesh(rig, new THREE.CylinderGeometry(0.26, 0.31, 0.34, 10), trousers, { position: [0, 0.86, 0], outlineScale: 1.035 });
  const torso = addMesh(rig, new THREE.CylinderGeometry(0.28, 0.36, 0.76, 12), jacket, { position: [0, 1.29, 0], outlineScale: 1.025 });
  addMesh(rig, new THREE.BoxGeometry(0.16, 0.62, 0.025), COLORS.cream, { position: [0, 1.3, 0.318], outline: false, shadow: false });
  addMesh(rig, new THREE.CylinderGeometry(0.1, 0.11, 0.12, 10), skin, { position: [0, 1.75, 0], outlineScale: 1.025 });
  const head = addMesh(rig, new THREE.SphereGeometry(0.265, 18, 12), skin, { position: [0, 2.02, 0], scale: [0.92, 1.08, 0.92], outlineScale: 1.022 });
  addMesh(rig, new THREE.SphereGeometry(0.055, 10, 8), skin, { position: [-0.265, 2.02, 0], outline: false });
  addMesh(rig, new THREE.SphereGeometry(0.055, 10, 8), skin, { position: [0.265, 2.02, 0], outline: false });
  addMesh(rig, new THREE.SphereGeometry(0.035, 8, 6), COLORS.ink, { position: [-0.09, 2.07, 0.235], outline: false, shadow: false });
  addMesh(rig, new THREE.SphereGeometry(0.035, 8, 6), COLORS.ink, { position: [0.09, 2.07, 0.235], outline: false, shadow: false });
  addMesh(rig, new THREE.ConeGeometry(0.035, 0.12, 8), skin, { position: [0, 1.99, 0.27], rotation: [Math.PI / 2, 0, 0], outline: false });
  addMesh(rig, new THREE.TorusGeometry(0.065, 0.012, 5, 12, Math.PI), 0x7d4037, { position: [0, 1.91, 0.242], rotation: [0, 0, Math.PI], outline: false, shadow: false });
  addMesh(rig, new THREE.SphereGeometry(0.278, 14, 8, 0, TAU, 0, Math.PI / 2), hair, { position: [0, 2.13, -0.018], scale: [0.96, 0.9, 0.96], outlineScale: 1.02 });
  [-0.17, -0.06, 0.07, 0.18].forEach((x, index) => addMesh(rig, new THREE.ConeGeometry(0.08, 0.22 + (index % 2) * 0.04, 7), hair, {
    position: [x, 2.15 - Math.abs(x) * 0.15, 0.17], rotation: [0.42, 0, x * 1.6], outline: false
  }));
  if (hat) {
    addMesh(rig, new THREE.CylinderGeometry(0.29, 0.31, 0.12, 14), COLORS.yellow, { position: [0, 2.28, 0], outlineScale: 1.025 });
    addMesh(rig, new THREE.BoxGeometry(0.42, 0.045, 0.3), COLORS.yellow, { position: [0, 2.25, 0.14], outlineScale: 1.025 });
  }
  const limbs = {};
  [["leftArm", -0.4], ["rightArm", 0.4]].forEach(([name, x]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.55, 0);
    addMesh(pivot, new THREE.CapsuleGeometry(0.085, 0.46, 5, 10), jacket, { position: [0, -0.29, 0], outlineScale: 1.03 });
    addMesh(pivot, new THREE.SphereGeometry(0.095, 10, 8), skin, { position: [0, -0.6, 0], outlineScale: 1.025 });
    rig.add(pivot);
    limbs[name] = pivot;
  });
  [["leftLeg", -0.17], ["rightLeg", 0.17]].forEach(([name, x]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.76, 0);
    addMesh(pivot, new THREE.CapsuleGeometry(0.105, 0.45, 5, 10), trousers, { position: [0, -0.31, 0], outlineScale: 1.03 });
    addMesh(pivot, new THREE.BoxGeometry(0.24, 0.16, 0.42), COLORS.cream, { position: [0, -0.66, 0.09], outlineScale: 1.025 });
    rig.add(pivot);
    limbs[name] = pivot;
  });
  if (bag) {
    addMesh(rig, new THREE.BoxGeometry(0.46, 0.58, 0.18), 0x9a6547, { position: [0, 1.2, -0.34], outlineScale: 1.03 });
    addMesh(rig, new THREE.TorusGeometry(0.47, 0.035, 6, 18, Math.PI * 1.15), COLORS.ink, { position: [0.04, 1.46, -0.03], rotation: [0.2, 0.15, 0.76], outline: false });
  }
  if (marker) {
    const markerMesh = makeMarker();
    markerMesh.position.y = 2.75;
    root.add(markerMesh);
    root.userData.marker = markerMesh;
  }
  Object.assign(root.userData, { rig, hips, torso, head, ...limbs });
  return root;
}

function animatePerson(person, phase, amount, time) {
  const { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg } = person.userData;
  const stride = Math.sin(phase) * amount;
  rig.position.y = amount > 0.03 ? Math.abs(Math.sin(phase * 2)) * 0.055 : Math.sin(time * 1.7) * 0.012;
  torso.rotation.z = -stride * 0.045;
  torso.rotation.x = amount * 0.05;
  head.rotation.y = amount < 0.05 ? Math.sin(time * 0.65) * 0.1 : 0;
  leftLeg.rotation.x = stride * 0.82;
  rightLeg.rotation.x = -stride * 0.82;
  leftArm.rotation.x = -stride * 0.68;
  rightArm.rotation.x = stride * 0.68;
}

function makeTree(scale = 1) {
  const group = new THREE.Group();
  addBlobShadow(group, 1.45 * scale, 1.05 * scale, 0.16);
  addMesh(group, new THREE.CylinderGeometry(0.1 * scale, 0.17 * scale, 1.3 * scale, 8), 0x73553d, { position: [0, 0.66 * scale, 0], outlineScale: 1.04 });
  [[0, 1.55, 0, .66], [-.35, 1.45, .06, .49], [.37, 1.48, -.04, .53], [.08, 1.88, 0, .48]].forEach(([x, y, z, size], index) => {
    addMesh(group, new THREE.IcosahedronGeometry(size * scale, 1), index === 3 ? COLORS.grassLight : COLORS.grassDark, {
      position: [x * scale, y * scale, z * scale], scale: [1, .85, 1], outlineScale: 1.02
    });
  });
  return group;
}

function makeGrassTuft(scale = 1) {
  const group = new THREE.Group();
  [-0.12, 0, 0.12].forEach((x, index) => addMesh(group, new THREE.ConeGeometry(0.065 * scale, (0.3 + index * 0.04) * scale, 4), COLORS.grassDark, {
    position: [x * scale, 0.15 * scale, 0], rotation: [0, 0, (index - 1) * 0.22], outline: false, shadow: false
  }));
  return group;
}

function makeLabel(text, accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,248,232,.94)";
  ctx.strokeStyle = "#1d3033";
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.roundRect(8, 8, 496, 112, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `#${new THREE.Color(accent).getHexString()}`;
  ctx.fillRect(25, 26, 12, 76);
  ctx.fillStyle = "#1d3033";
  ctx.font = "900 46px 'Kaiti SC', 'STKaiti', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 274, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
  sprite.scale.set(1.62, 0.41, 1);
  return sprite;
}

function addWindow(group, x, y, z, color = 0x9fc7c2) {
  addMesh(group, new THREE.BoxGeometry(0.3, 0.36, 0.05), color, { position: [x, y, z], outlineScale: 1.04 });
  addMesh(group, new THREE.BoxGeometry(0.025, 0.34, 0.06), COLORS.cream, { position: [x, y, z + .035], outline: false, shadow: false });
}

function addContainer(group, x, y, z, color, rotationY = 0) {
  const container = new THREE.Group();
  addMesh(container, new THREE.BoxGeometry(1.32, .58, .72), color, { position: [0, 0, 0], outlineScale: 1.022 });
  [-.43, -.14, .14, .43].forEach((ridgeX) => addMesh(container, new THREE.BoxGeometry(.028, .48, .025), COLORS.ink, {
    position: [ridgeX, 0, .372], outline: false, shadow: false
  }));
  container.position.set(x, y, z);
  container.rotation.y = rotationY;
  group.add(container);
  return container;
}

function makeBuilding(location) {
  const group = new THREE.Group();
  addBlobShadow(group, 4.1, 2.7, 0.18);
  const { kind, color } = location;
  if (kind === "airport") {
    addMesh(group, new THREE.BoxGeometry(3.9, 1.25, 1.8), color, { position: [0, .72, 0] });
    addMesh(group, new THREE.BoxGeometry(4.25, .14, 2.05), COLORS.cream, { position: [0, 1.43, 0] });
    [-1.25, -.42, .42, 1.25].forEach((x) => addWindow(group, x, .82, .93));
    addMesh(group, new THREE.BoxGeometry(1.15, .78, .12), 0x6e969e, { position: [0, .55, .96], outlineScale: 1.03 });
    addMesh(group, new THREE.CylinderGeometry(.07, .07, 2.9, 8), COLORS.cream, { position: [0, 2.25, -.1], rotation: [0, 0, Math.PI / 2] });
    addMesh(group, new THREE.BoxGeometry(1.65, .1, .46), COLORS.cream, { position: [0, 2.25, -.1], rotation: [.03, 0, .15] });
  } else if (kind === "shipyard") {
    addMesh(group, new THREE.BoxGeometry(3.3, 1.05, 2.2), color, { position: [0, .58, 0] });
    addMesh(group, new THREE.BoxGeometry(3.6, .18, 2.48), COLORS.navy, { position: [0, 1.22, 0] });
    [-1.15, -.38, .38, 1.15].forEach((x) => addWindow(group, x, .7, 1.13, 0xbad1c8));
    addMesh(group, new THREE.CylinderGeometry(.11, .15, 3.7, 8), COLORS.ink, { position: [-1.7, 2.1, 0] });
    addMesh(group, new THREE.BoxGeometry(3.4, .14, .14), COLORS.ink, { position: [-.08, 3.86, 0], rotation: [0, 0, -.08] });
    addMesh(group, new THREE.BoxGeometry(.11, 2.1, .11), COLORS.ink, { position: [1.45, 2.9, 0], rotation: [0, 0, -.22] });
    addMesh(group, new THREE.BoxGeometry(.5, .52, .5), COLORS.yellow, { position: [1.7, 1.72, 0] });
  } else if (kind === "immigration" || kind === "customs") {
    const authorityColor = kind === "immigration" ? 0x9a5549 : 0x58747a;
    addMesh(group, new THREE.BoxGeometry(3.45, 1.62, 2), authorityColor, { position: [0, .88, 0] });
    addMesh(group, new THREE.BoxGeometry(3.8, .16, 2.28), COLORS.cream, { position: [0, 1.78, 0] });
    [-1.08, -.36, .36, 1.08].forEach((x) => addWindow(group, x, 1.05, 1.03, 0xb7c6bd));
    addMesh(group, new THREE.BoxGeometry(1.85, .34, .12), kind === "immigration" ? COLORS.orange : COLORS.yellow, { position: [0, 1.52, 1.08], outlineScale: 1.025 });
    addMesh(group, new THREE.BoxGeometry(.52, .92, .13), COLORS.navy, { position: [0, .48, 1.05], outlineScale: 1.03 });
    addMesh(group, new THREE.CylinderGeometry(.035, .045, 2.8, 7), COLORS.ink, { position: [-1.95, 1.42, .65] });
    addMesh(group, new THREE.BoxGeometry(.82, .38, .035), 0xa74235, { position: [-1.54, 2.55, .65], outlineScale: 1.02 });
    if (kind === "immigration") {
      addMesh(group, new THREE.BoxGeometry(2.7, .14, .14), COLORS.ink, { position: [2.35, 2.22, .5] });
      addMesh(group, new THREE.BoxGeometry(.14, 2.15, .14), COLORS.ink, { position: [1.05, 1.08, .5] });
      addMesh(group, new THREE.BoxGeometry(.14, 2.15, .14), COLORS.ink, { position: [3.65, 1.08, .5] });
      addMesh(group, new THREE.BoxGeometry(1.65, .1, .18), COLORS.orange, { position: [2.48, .72, .62], rotation: [0, 0, -.08] });
    }
  } else if (kind === "container") {
    const boxColors = [COLORS.orange, COLORS.yellow, COLORS.blue, COLORS.rust];
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        addContainer(group, (column - 1.5) * 1.16, .3 + row * .59, column % 2 ? -.43 : .43, boxColors[(row + column) % boxColors.length]);
      }
    }
    addMesh(group, new THREE.BoxGeometry(4.9, .12, 1.65), 0x776957, { position: [0, .02, 0], outlineScale: 1.015 });
  } else if (kind === "cargo") {
    const boxColors = [COLORS.orange, COLORS.yellow, COLORS.blue, COLORS.rust];
    for (let column = 0; column < 4; column += 1) addContainer(group, (column - 1.5) * 1.15, .31, column % 2 ? -.4 : .4, boxColors[column]);
    addMesh(group, new THREE.CylinderGeometry(.11, .15, 3.55, 8), COLORS.ink, { position: [-2.35, 1.88, 0] });
    addMesh(group, new THREE.BoxGeometry(3.4, .14, .14), COLORS.ink, { position: [-.7, 3.48, 0], rotation: [0, 0, -.1] });
    addMesh(group, new THREE.BoxGeometry(.11, 1.95, .11), COLORS.ink, { position: [.85, 2.55, 0], rotation: [0, 0, -.23] });
  } else if (kind === "anchorage") {
    addMesh(group, new THREE.BoxGeometry(3.8, .48, 1.45), COLORS.cream, { position: [0, .38, 0] });
    addMesh(group, new THREE.BoxGeometry(1.55, 1, 1.18), color, { position: [.25, 1.12, 0] });
    addWindow(group, -.12, 1.23, .61);
    addWindow(group, .62, 1.23, .61);
    addMesh(group, new THREE.CylinderGeometry(.05, .05, 2.05, 7), COLORS.ink, { position: [.08, 2.55, 0] });
    addMesh(group, new THREE.BoxGeometry(1.05, .08, .06), COLORS.orange, { position: [.52, 3.01, 0], rotation: [0, 0, -.18] });
  } else {
    addMesh(group, new THREE.BoxGeometry(2.75, 2.05, 1.8), color, { position: [0, 1.12, 0] });
    addMesh(group, new THREE.ConeGeometry(1.95, .92, 4), kind === "office" ? COLORS.orange : COLORS.cream, { position: [0, 2.58, 0], rotation: [0, Math.PI / 4, 0] });
    [-.76, 0, .76].forEach((x) => addWindow(group, x, 1.42, .93));
    addMesh(group, new THREE.BoxGeometry(.48, 1.04, .13), COLORS.navy, { position: [0, .56, .96], outlineScale: 1.03 });
    addMesh(group, new THREE.BoxGeometry(2.1, .22, .14), COLORS.cream, { position: [0, 2.05, .98], outlineScale: 1.03 });
  }
  return group;
}

function makeBoat(color, scale = 1) {
  const group = new THREE.Group();
  addMesh(group, new THREE.BoxGeometry(3.7 * scale, .55 * scale, 1.35 * scale), COLORS.cream, { position: [0, .3 * scale, 0], outlineScale: 1.02 });
  addMesh(group, new THREE.BoxGeometry(1.45 * scale, .9 * scale, 1.05 * scale), color, { position: [.18 * scale, 1.02 * scale, 0], outlineScale: 1.025 });
  addMesh(group, new THREE.CylinderGeometry(.04 * scale, .04 * scale, 1.55 * scale, 7), COLORS.ink, { position: [0, 2.03 * scale, 0] });
  addMesh(group, new THREE.BoxGeometry(.82 * scale, .055 * scale, .05 * scale), COLORS.orange, { position: [.36 * scale, 2.37 * scale, 0], rotation: [0, 0, -.15] });
  return group;
}

function makeQuayCrane(color = COLORS.orange) {
  const group = new THREE.Group();
  addBlobShadow(group, 4.8, 2.5, .18);
  [-1.25, 1.25].forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(.18, 3.9, .2), color, { position: [x, 1.95, 0], rotation: [0, 0, x * -.1], outlineScale: 1.035 });
    addMesh(group, new THREE.BoxGeometry(.58, .18, .72), COLORS.ink, { position: [x, .12, 0], outlineScale: 1.025 });
  });
  addMesh(group, new THREE.BoxGeometry(3.25, .24, .34), color, { position: [0, 3.9, 0], outlineScale: 1.03 });
  addMesh(group, new THREE.BoxGeometry(6.1, .2, .24), color, { position: [1.48, 4.45, 0], rotation: [0, 0, -.035], outlineScale: 1.03 });
  addMesh(group, new THREE.BoxGeometry(2.65, .12, .14), COLORS.ink, { position: [-.05, 3.05, 0], rotation: [0, 0, .72], outlineScale: 1.02 });
  addMesh(group, new THREE.BoxGeometry(2.65, .12, .14), COLORS.ink, { position: [.05, 3.05, 0], rotation: [0, 0, -.72], outlineScale: 1.02 });
  addMesh(group, new THREE.BoxGeometry(.72, .58, .64), COLORS.cream, { position: [-.7, 4.18, 0], outlineScale: 1.025 });
  const trolley = new THREE.Group();
  trolley.position.set(.6, 4.28, 0);
  addMesh(trolley, new THREE.BoxGeometry(.45, .22, .48), COLORS.navy, { outlineScale: 1.025 });
  const cable = addMesh(trolley, new THREE.CylinderGeometry(.025, .025, 1.45, 7), COLORS.ink, { position: [0, -.82, 0], outline: false, shadow: false });
  const spreader = addMesh(trolley, new THREE.BoxGeometry(1.12, .12, .52), COLORS.yellow, { position: [0, -1.56, 0], outlineScale: 1.03 });
  const cargo = new THREE.Group();
  addContainer(cargo, 0, -1.98, 0, COLORS.rust);
  trolley.add(cargo);
  group.add(trolley);
  Object.assign(group.userData, { trolley, cable, spreader, cargo });
  return group;
}

function makeYardGantry() {
  const group = new THREE.Group();
  [-1.65, 1.65].forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(.2, 2.7, .22), COLORS.yellow, { position: [x, 1.36, 0], rotation: [0, 0, x * -.07], outlineScale: 1.035 });
    [-.45, .45].forEach((z) => addMesh(group, new THREE.CylinderGeometry(.13, .13, .16, 10), COLORS.ink, {
      position: [x, .12, z], rotation: [Math.PI / 2, 0, 0], outlineScale: 1.025
    }));
  });
  addMesh(group, new THREE.BoxGeometry(3.9, .24, .5), COLORS.yellow, { position: [0, 2.78, 0], outlineScale: 1.03 });
  addMesh(group, new THREE.BoxGeometry(.5, .4, .56), COLORS.navy, { position: [.55, 2.52, 0], outlineScale: 1.025 });
  addMesh(group, new THREE.CylinderGeometry(.025, .025, 1.15, 7), COLORS.ink, { position: [.55, 1.84, 0], outline: false });
  addMesh(group, new THREE.BoxGeometry(1.05, .1, .48), COLORS.orange, { position: [.55, 1.28, 0], outlineScale: 1.03 });
  return group;
}

function makeBeachUmbrella(color) {
  const group = new THREE.Group();
  addMesh(group, new THREE.CylinderGeometry(.035, .045, 1.45, 7), 0x775c45, { position: [0, .72, 0], outlineScale: 1.03 });
  addMesh(group, new THREE.ConeGeometry(.82, .38, 18), color, { position: [0, 1.42, 0], rotation: [Math.PI, 0, 0], outlineScale: 1.025 });
  addMesh(group, new THREE.BoxGeometry(.85, .08, .34), COLORS.cream, { position: [.72, .12, .2], rotation: [0, -.25, 0], outlineScale: 1.025 });
  return group;
}

class PortWorld {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.sky, 24, 58);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.camera = new THREE.PerspectiveCamera(42, 1, .1, 180);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.cameraYaw = state.facing;
    this.renderers = new Map();
    [["intro", elements.titleCanvas], ["play", elements.worldCanvas]].forEach(([name, canvas]) => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.78;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderers.set(name, renderer);
    });
    const hemisphere = new THREE.HemisphereLight(0xe9e4d3, 0x3d4d45, 2.05);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xf4ddba, 2.85);
    sun.position.set(-14, 24, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    this.locationGroups = new Map();
    this.ambientPeople = [];
    this.clouds = [];
    this.walkSurfaces = [];
    this.craneMotions = [];
    this.player = makePerson({ jacket: COLORS.orange, trousers: COLORS.navy, skin: COLORS.skinC, hair: 0x4a2d28, bag: true });
    this.world.add(this.player);
    this.moveMarker = new THREE.Group();
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(.3, .38, 32),
      new THREE.MeshBasicMaterial({ color: COLORS.orange, transparent: true, opacity: .88, side: THREE.DoubleSide, depthWrite: false })
    );
    targetRing.rotation.x = -Math.PI / 2;
    this.moveMarker.add(targetRing);
    [-1, 1].forEach((direction) => {
      const stroke = new THREE.Mesh(new THREE.BoxGeometry(.24, .035, .035), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
      stroke.rotation.y = Math.PI / 4 * direction;
      this.moveMarker.add(stroke);
    });
    this.moveMarker.visible = false;
    this.world.add(this.moveMarker);
    this.buildWorld();
    this.resize();
  }

  makeIsland(radius, color, offset, scaleZ = PLANET_Z_SCALE) {
    const radialSegments = 28;
    const angularSegments = 128;
    const vertices = [];
    const indices = [];
    for (let ring = 0; ring <= radialSegments; ring += 1) {
      const ringRadius = radius * ring / radialSegments;
      for (let segment = 0; segment <= angularSegments; segment += 1) {
        const angle = segment / angularSegments * TAU;
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius * scaleZ;
        vertices.push(x, terrainHeight(x, z) + offset, z);
      }
    }
    for (let ring = 0; ring < radialSegments; ring += 1) {
      for (let segment = 0; segment < angularSegments; segment += 1) {
        const current = ring * (angularSegments + 1) + segment;
        const next = current + angularSegments + 1;
        indices.push(current, current + 1, next, current + 1, next + 1, next);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, toonMaterial(color));
    mesh.receiveShadow = true;
    return mesh;
  }

  addRoad(points, width = .56) {
    const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + .105, z));
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", .18);
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, width, 9, false), toonMaterial(COLORS.road));
    road.receiveShadow = true;
    this.world.add(road);
  }

  buildWorld() {
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(COLORS.sea) }, uB: { value: new THREE.Color(COLORS.seaDeep) } },
      vertexShader: `uniform float uTime; varying float vWave; void main(){ vec3 p=position; float w=sin((p.x+p.z)*.18+uTime)*.08+cos((p.z-p.x)*.14-uTime*.72)*.055; p+=normal*w; vWave=w; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform vec3 uA; uniform vec3 uB; varying float vWave; void main(){ float wash=smoothstep(-.16,.16,vWave); float inkLine=1.-smoothstep(0.,.026,abs(vWave-.018)); vec3 color=mix(uB,uA,wash); color=mix(color,vec3(.08,.14,.13),inkLine*.24); gl_FragColor=vec4(color,1.); }`
    });
    const water = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS, 96, 64), this.waterMaterial);
    water.scale.z = PLANET_Z_SCALE;
    water.position.y = PLANET_CENTER_Y;
    water.receiveShadow = true;
    this.world.add(water);
    const soil = this.makeIsland(21.15, COLORS.cliff, -.16);
    const sand = this.makeIsland(20.85, COLORS.sand, .04);
    const grass = this.makeIsland(18.9, COLORS.grass, .13);
    this.world.add(soil, sand, grass);
    this.walkSurfaces.push(sand, grass);
    const shorelinePoints = Array.from({ length: 72 }, (_, index) => {
      const angle = index / 72 * TAU;
      const x = Math.cos(angle) * 19.55;
      const z = Math.sin(angle) * 19.55 * PLANET_Z_SCALE;
      return new THREE.Vector3(x, terrainHeight(x, z) + .17, z);
    });
    const shoreline = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shorelinePoints, true), 144, .045, 6, true),
      toonMaterial(COLORS.cream)
    );
    this.world.add(shoreline);
    this.addRoad([[0, 8.2], [-6.5, 8], [-14.4, 8]]);
    this.addRoad([[-14.4, 8], [-11, 5.4], [-9.2, 2.3], [-2.2, -1.7], [3.7, 3.3], [9, 5.5], [13.8, 7.4]]);
    this.addRoad([[3.7, 3.3], [8.4, .3], [14, -3.1], [9.2, -8], [4.7, -11], [-3.8, -10], [-11.2, -10]]);
    this.addRoad([[-11.2, -10], [-8.1, -4.2], [-2.2, -1.7]]);
    locations.forEach((location, index) => {
      const [x, z] = location.position;
      const building = makeBuilding(location);
      building.position.set(x, terrainHeight(x, z), z);
      building.rotation.y = (index % 3 - 1) * .08;
      this.world.add(building);
      const label = makeLabel(location.short, location.color);
      label.position.set(x, terrainHeight(x, z) + 3.75, z);
      this.world.add(label);
      const skinTones = [COLORS.skinA, COLORS.skinB, COLORS.skinC];
      const npc = makePerson({
        jacket: location.color, trousers: index % 2 ? COLORS.navy : 0x48504b, skin: skinTones[index % skinTones.length],
        hair: index % 3 === 1 ? 0x211e1e : 0x4a3028, bag: index % 2 === 0,
        hat: ["shipyard", "container", "cargo"].includes(location.kind), marker: true
      });
      const [npcX, npcZ] = location.interact;
      npc.position.set(npcX, terrainHeight(npcX, npcZ), npcZ);
      npc.rotation.y = Math.atan2(x - npcX, z - npcZ) + Math.PI;
      npc.userData.anchor = new THREE.Vector2(npcX, npcZ);
      npc.userData.phase = index * 1.7;
      npc.userData.wanderRadius = .24 + (index % 3) * .11;
      this.world.add(npc);
      this.locationGroups.set(location.id, { location, building, label, npc, marker: npc.userData.marker });
      colliders.push({ x, z, radius: ["container", "cargo"].includes(location.kind) ? 2.65 : 2.1 });
    });

    const terminalPadY = terrainHeight(14.6, -9.1) + .02;
    addMesh(this.world, new THREE.BoxGeometry(6.6, .22, 3.7), 0x6e7168, {
      position: [14.6, terminalPadY, -9.1], rotation: [0, .12, 0], outlineScale: 1.015
    });
    const quayCrane = makeQuayCrane(COLORS.orange);
    quayCrane.position.set(15.2, terminalPadY + .12, -9.2);
    quayCrane.rotation.y = .54;
    quayCrane.scale.setScalar(1.12);
    this.world.add(quayCrane);
    this.craneMotions.push({ crane: quayCrane, phase: 0 });
    colliders.push({ x: 15.2, z: -9.2, radius: 1.75 });

    const yardStacks = new THREE.Group();
    const terminalColors = [COLORS.orange, COLORS.blue, COLORS.yellow, COLORS.rust];
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        addContainer(yardStacks, (column - 2) * 1.3, .31 + row * .6, column % 2 ? -.58 : .58, terminalColors[(row + column) % terminalColors.length]);
      }
    }
    yardStacks.position.set(10.4, terrainHeight(10.4, -5.7), -5.7);
    yardStacks.rotation.y = -.08;
    this.world.add(yardStacks);
    const yardGantry = makeYardGantry();
    yardGantry.position.set(10.4, terrainHeight(10.4, -5.7) + .04, -5.7);
    yardGantry.rotation.y = -.08;
    yardGantry.scale.setScalar(1.08);
    this.world.add(yardGantry);
    colliders.push({ x: 10.4, z: -5.7, radius: 1.55 });

    const cargoCrane = makeQuayCrane(COLORS.yellow);
    cargoCrane.position.set(5.1, terrainHeight(5.1, -13) + .04, -13);
    cargoCrane.rotation.y = 1.2;
    cargoCrane.scale.setScalar(.72);
    this.world.add(cargoCrane);
    this.craneMotions.push({ crane: cargoCrane, phase: Math.PI * .75 });

    [[-17.1, -7.2, COLORS.orange, .15], [-13.3, -10.2, COLORS.yellow, -.4], [-17.8, 5.6, COLORS.blue, .42]].forEach(([x, z, color, rotation]) => {
      const umbrella = makeBeachUmbrella(color);
      umbrella.position.set(x, terrainHeight(x, z) + .06, z);
      umbrella.rotation.y = rotation;
      umbrella.scale.setScalar(.82);
      this.world.add(umbrella);
    });
    const beachFlag = new THREE.Group();
    addMesh(beachFlag, new THREE.CylinderGeometry(.025, .035, 1.8, 7), COLORS.ink, { position: [0, .9, 0], outline: false });
    addMesh(beachFlag, new THREE.BoxGeometry(.58, .3, .025), COLORS.orange, { position: [.29, 1.56, 0], outlineScale: 1.02 });
    beachFlag.position.set(-18.1, terrainHeight(-18.1, -3.8), -3.8);
    this.world.add(beachFlag);

    const treePositions = [
      [-16, -2, 1], [-12, 11.5, 1.05], [-8, 10.5, 1.15], [-4.5, 12, 1.3],
      [-4, 4.4, .85], [-.7, 11.3, 1.18], [3, 11.2, 1], [7.2, 9.6, 1.25], [10, 11.2, 1.08], [17.3, 4.5, 1.2],
      [18, -1, 1], [.2, -13.2, 1], [-6, -12.3, 1.25],
      [-13.5, -3, .9], [-7, -1, .78], [7.3, 7, .8], [7.6, -3.5, .78], [.5, 3.3, .72]
    ];
    treePositions.forEach(([x, z, scale]) => {
      const tree = makeTree(scale);
      tree.position.set(x, terrainHeight(x, z), z);
      this.world.add(tree);
    });
    for (let index = 0; index < 120; index += 1) {
      const angle = random() * TAU;
      const radius = 5 + random() * 14.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * .72;
      if (locations.some((location) => Math.hypot(x - location.position[0], z - location.position[1]) < 3.1)) continue;
      const tuft = makeGrassTuft(.65 + random() * .65);
      tuft.position.set(x, terrainHeight(x, z) + .02, z);
      tuft.rotation.y = random() * TAU;
      this.world.add(tuft);
    }
    for (let index = 0; index < 25; index += 1) {
      const angle = random() * TAU;
      const radius = 8 + random() * 11.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * .72;
      const rock = new THREE.Group();
      addMesh(rock, new THREE.DodecahedronGeometry(.22 + random() * .32, 0), index % 3 ? 0x718273 : 0x9b8d72, { scale: [1.4, .7, 1], outlineScale: 1.035 });
      rock.position.set(x, terrainHeight(x, z) + .16, z);
      rock.rotation.y = random() * TAU;
      this.world.add(rock);
    }
    for (let index = 0; index < 10; index += 1) {
      const angle = index / 10 * TAU;
      const radius = 10.5 + (index % 3) * 2.8;
      const person = makePerson({
        jacket: [0x9c6654, 0x56796e, 0xc48a4a][index % 3], trousers: COLORS.navy,
        skin: [COLORS.skinA, COLORS.skinB, COLORS.skinC][index % 3], hair: index % 2 ? 0x292424 : 0x5c3a2c, bag: index % 3 === 0
      });
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * .68;
      person.position.set(x, terrainHeight(x, z), z);
      person.userData.anchor = new THREE.Vector2(x, z);
      person.userData.phase = index * .73;
      person.userData.wanderRadius = .7 + (index % 3) * .35;
      this.world.add(person);
      this.ambientPeople.push(person);
    }
    const westPier = addMesh(this.world, new THREE.BoxGeometry(3.5, .28, 5.4), 0x85664f, {
      position: [-10.6, terrainHeight(-10.6, -13.2) - .02, -13.2], rotation: [-.2, .04, 0], outlineScale: 1.02
    });
    westPier.receiveShadow = true;
    const eastPier = addMesh(this.world, new THREE.BoxGeometry(4.1, .28, 5.6), 0x85664f, {
      position: [8.3, terrainHeight(8.3, -13.5) - .02, -13.5], rotation: [-.2, -.05, 0], outlineScale: 1.02
    });
    eastPier.receiveShadow = true;
    const boatA = makeBoat(COLORS.blue, 1.05); boatA.position.set(-13.8, globeHeight(-13.8, -16.5) + .35, -16.5); boatA.rotation.y = -.35; this.world.add(boatA);
    const boatB = makeBoat(COLORS.orange, 1.1); boatB.position.set(15.8, globeHeight(15.8, -14.5) + .35, -14.5); boatB.rotation.y = .85; this.world.add(boatB);
    [[-25, -8, 3.3], [25, -7, 3.7], [-19, 15, 3], [18, 16, 3.4]].forEach(([x, z, scale]) => {
      const island = new THREE.Group();
      addMesh(island, new THREE.DodecahedronGeometry(scale, 1), COLORS.grassDark, { scale: [1.5, .38, 1], outlineScale: 1.02 });
      island.position.set(x, globeHeight(x, z) + .2, z);
      this.world.add(island);
    });
    for (let index = 0; index < 7; index += 1) {
      const cloud = new THREE.Group();
      [0, .8, 1.5].forEach((x, part) => addMesh(cloud, new THREE.SphereGeometry(.85 + part * .14, 12, 8), COLORS.cream, {
        position: [x, part === 1 ? .3 : 0, 0], scale: [1.3, .62, .82], outline: false, shadow: false
      }));
      cloud.position.set(-25 + index * 8, 10 + (index % 3) * 2, -18 + (index % 4) * 11);
      cloud.scale.setScalar(.9 + (index % 2) * .35);
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  groundPointFromPointer(clientX, clientY) {
    const rect = elements.worldCanvas.getBoundingClientRect();
    this.pointer.set(
      (clientX - rect.left) / rect.width * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.walkSurfaces, false);
    return hits.length ? hits[0].point : null;
  }

  clickedLocation(clientX, clientY) {
    const rect = elements.worldCanvas.getBoundingClientRect();
    let closest = null;
    let closestDistance = rect.width < 760 ? 62 : 90;
    this.locationGroups.forEach(({ location, npc }) => {
      const screen = npc.position.clone().add(new THREE.Vector3(0, 1.25, 0)).project(this.camera);
      if (screen.z < -1 || screen.z > 1) return;
      const x = rect.left + (screen.x + 1) * .5 * rect.width;
      const y = rect.top + (1 - screen.y) * .5 * rect.height;
      const distance = Math.hypot(clientX - x, clientY - y);
      if (distance < closestDistance) {
        closest = location;
        closestDistance = distance;
      }
    });
    return closest;
  }

  showMoveMarker(point) {
    this.moveMarker.position.set(point.x, terrainHeight(point.x, point.z) + .08, point.z);
    this.moveMarker.visible = true;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderers.forEach((renderer) => renderer.setSize(width, height, false));
  }

  updatePeople(time) {
    this.locationGroups.forEach(({ npc, label, location }, id) => {
      const { anchor, phase, wanderRadius } = npc.userData;
      const x = anchor.x + Math.sin(time * .34 + phase) * wanderRadius;
      const z = anchor.y + Math.sin(time * .21 + phase * 1.8) * wanderRadius * .65;
      const dx = x - npc.position.x;
      const dz = z - npc.position.z;
      npc.position.set(x, terrainHeight(x, z), z);
      if (Math.abs(dx) + Math.abs(dz) > .0001) npc.rotation.y = Math.atan2(dx, dz);
      animatePerson(npc, time * 2.15 + phase, .22, time);
      const near = state.nearbyId === id;
      const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(time * 3 + phase) * .08;
      npc.userData.marker.scale.setScalar(near ? 1.32 : pulse);
      npc.userData.marker.position.y = 2.75 + (reducedMotion.matches ? 0 : Math.sin(time * 2.4 + phase) * .08);
      const labelDistance = Math.hypot(state.position.x - location.position[0], state.position.z - location.position[1]);
      label.visible = state.mode === "intro" || (labelDistance > 8 && labelDistance < 15);
    });
    this.ambientPeople.forEach((person, index) => {
      const { anchor, phase, wanderRadius } = person.userData;
      const x = anchor.x + Math.sin(time * .22 + phase) * wanderRadius;
      const z = anchor.y + Math.cos(time * .18 + phase) * wanderRadius;
      const dx = x - person.position.x;
      const dz = z - person.position.z;
      person.position.set(x, terrainHeight(x, z), z);
      person.rotation.y = Math.atan2(dx, dz);
      animatePerson(person, time * 1.65 + index, .28, time);
    });
  }

  render(time, delta) {
    this.waterMaterial.uniforms.uTime.value = time * .75;
    this.updatePeople(time);
    this.craneMotions.forEach(({ crane, phase }) => {
      const { trolley, cable, spreader, cargo } = crane.userData;
      const travel = reducedMotion.matches ? .55 : .55 + Math.sin(time * .34 + phase) * 1.55;
      const cableScale = reducedMotion.matches ? 1 : 1 + (Math.sin(time * .27 + phase + .8) + 1) * .16;
      trolley.position.x = travel;
      cable.scale.y = cableScale;
      cable.position.y = -.82 * cableScale;
      spreader.position.y = -1.56 * cableScale;
      cargo.position.y = -(cableScale - 1) * 1.8;
    });
    this.clouds.forEach((cloud, index) => {
      if (!reducedMotion.matches) cloud.position.x = -30 + ((time * (.18 + index * .015) + index * 9) % 70);
    });
    this.player.visible = state.mode === "play";
    if (state.mode === "play") {
      const movement = Math.min(state.velocity.length() / 5.1, 1);
      animatePerson(this.player, state.runPhase, movement, time);
      if (!state.grounded) {
        const tuck = Math.min(state.jumpHeight * .55, .38);
        this.player.userData.leftArm.rotation.x = -.55;
        this.player.userData.rightArm.rotation.x = -.55;
        this.player.userData.leftLeg.rotation.x += tuck;
        this.player.userData.rightLeg.rotation.x += tuck;
      }
      this.player.rotation.y = state.facing;
      const ground = terrainHeight(state.position.x, state.position.z);
      this.player.position.set(state.position.x, ground + state.jumpHeight, state.position.z);
      const yawLerp = state.cameraSnap || reducedMotion.matches ? 1 : 1 - Math.exp(-6.5 * delta);
      this.cameraYaw = lerpAngle(this.cameraYaw, state.facing, yawLerp);
      const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
      const cameraLerp = state.cameraSnap || reducedMotion.matches ? 1 : 1 - Math.exp(-7.2 * delta);
      if (state.cameraMode === "first") {
        const eye = new THREE.Vector3(state.position.x, ground + state.jumpHeight + 1.86, state.position.z).addScaledVector(forward, .08);
        this.camera.position.lerp(eye, cameraLerp);
        this.camera.lookAt(eye.clone().addScaledVector(forward, 14).add(new THREE.Vector3(0, -.35, 0)));
        this.player.visible = false;
      } else {
        const mobile = window.innerWidth < 760;
        const distance = mobile ? Math.max(6.2, state.cameraDistance - .4) : state.cameraDistance;
        const desired = new THREE.Vector3(state.position.x, ground + state.jumpHeight, state.position.z)
          .addScaledVector(forward, -distance)
          .add(new THREE.Vector3(0, mobile ? 5.5 : 4.8, 0));
        const focus = new THREE.Vector3(state.position.x, ground + state.jumpHeight + 1.15, state.position.z)
          .addScaledVector(forward, 2.2);
        this.camera.position.lerp(desired, cameraLerp);
        this.camera.lookAt(focus);
      }
      if (this.moveMarker.visible && !reducedMotion.matches) {
        const pulse = 1 + Math.sin(time * 5.2) * .08;
        this.moveMarker.scale.setScalar(pulse);
      } else {
        this.moveMarker.scale.setScalar(1);
      }
      state.cameraSnap = false;
    } else {
      const mobile = window.innerWidth < 760;
      const orbit = reducedMotion.matches ? .72 : .72 + time * .018;
      const distance = mobile ? 68 : 62;
      this.camera.position.set(Math.sin(orbit) * distance, mobile ? 70 : 62, Math.cos(orbit) * distance);
      this.camera.lookAt(0, -8, 0);
    }
    this.renderers.get(state.mode).render(this.scene, this.camera);
  }
}

let stage;

function setMode(mode) {
  state.mode = mode;
  elements.intro.classList.toggle("is-active", mode === "intro");
  elements.play.classList.toggle("is-active", mode === "play");
}

function updateHud() {
  elements.clock.textContent = formatTime(state.minutes);
  elements.trust.textContent = Math.round(state.trust);
  elements.encountered.textContent = state.encounterCount;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

function setCameraMode(mode) {
  state.cameraMode = mode;
  state.cameraSnap = true;
  const firstPerson = mode === "first";
  elements.viewSwitch.setAttribute("aria-pressed", String(firstPerson));
  elements.viewSwitch.querySelector("span").textContent = firstPerson ? "第一人称" : "第三人称";
}

function toggleCameraMode() {
  setCameraMode(state.cameraMode === "third" ? "first" : "third");
  showToast(state.cameraMode === "first" ? "第一人称 · 点击前方地面继续跑" : "第三人称 · 现在可以看见自己");
}

function jump() {
  if (state.mode !== "play" || !state.grounded || elements.dialog.open || elements.help.open) return;
  state.grounded = false;
  state.jumpVelocity = 6.15;
}

function setDestination(point, pendingInteractId = null) {
  if (!point || !insideIsland(point.x, point.z) || collides(point.x, point.z)) {
    showToast("那里走不过去，换一块地面试试");
    return;
  }
  state.destination = new THREE.Vector3(point.x, 0, point.z);
  state.pendingInteractId = pendingInteractId;
  stage.showMoveMarker(point);
}

function moveFromPointer(clientX, clientY) {
  if (state.mode !== "play" || elements.dialog.open || elements.help.open) return;
  const clickedLocation = stage.clickedLocation(clientX, clientY);
  if (clickedLocation) {
    const group = stage.locationGroups.get(clickedLocation.id);
    const npcDistance = Math.hypot(state.position.x - group.npc.position.x, state.position.z - group.npc.position.z);
    if (npcDistance < 2.5) {
      state.nearbyId = clickedLocation.id;
      interact();
      return;
    }
    const npcPoint = new THREE.Vector3(group.npc.position.x, 0, group.npc.position.z);
    const approach = npcPoint.clone().sub(new THREE.Vector3(clickedLocation.position[0], 0, clickedLocation.position[1])).normalize();
    setDestination(npcPoint.addScaledVector(approach, 1.15), clickedLocation.id);
    showToast(`正在前往 ${clickedLocation.name}`);
    return;
  }
  setDestination(stage.groundPointFromPointer(clientX, clientY));
}

function resetGame() {
  state.position.set(3.1, 0, 7.2);
  state.velocity.set(0, 0, 0);
  state.facing = Math.PI;
  state.destination = null;
  state.pendingInteractId = null;
  state.jumpHeight = 0;
  state.jumpVelocity = 0;
  state.grounded = true;
  state.cameraDistance = 7.4;
  stage.cameraYaw = state.facing;
  stage.moveMarker.visible = false;
  setCameraMode("third");
  state.minutes = 445;
  state.trust = 72;
  state.encounterCount = 0;
  state.nearbyId = null;
  state.activeEncounter = null;
  state.activeChoice = false;
  state.runPhase = 0;
  state.distanceWalked = 0;
  state.nextAmbientAt = 28;
  state.lastEncounter.clear();
  state.keys.clear();
  Object.keys(state.holds).forEach((key) => { state.holds[key] = false; });
  updateHud();
  drawMinimap();
  setMode("play");
  showToast("点击地面奔跑 · 点击带 ◇ 的人物可自动前往");
}

function movementAxes() {
  const left = state.holds.left || state.keys.has("ArrowLeft") || state.keys.has("KeyA");
  const right = state.holds.right || state.keys.has("ArrowRight") || state.keys.has("KeyD");
  const up = state.holds.up || state.keys.has("ArrowUp") || state.keys.has("KeyW");
  const down = state.holds.down || state.keys.has("ArrowDown") || state.keys.has("KeyS");
  return { x: Number(right) - Number(left), z: Number(down) - Number(up) };
}

function insideIsland(x, z) {
  return (x / (ISLAND_X - 1.15)) ** 2 + (z / (ISLAND_Z - 1.15)) ** 2 < 1;
}

function collides(x, z) {
  return colliders.some((item) => Math.hypot(x - item.x, z - item.z) < item.radius + .42);
}

function moveCandidate(x, z) {
  if (!insideIsland(x, z) || collides(x, z)) return false;
  state.position.x = x;
  state.position.z = z;
  return true;
}

function applyMovement(direction, distance) {
  if (!direction.lengthSq()) return false;
  const previousX = state.position.x;
  const previousZ = state.position.z;
  direction.normalize();
  const nextX = state.position.x + direction.x * distance;
  const nextZ = state.position.z + direction.z * distance;
  if (!moveCandidate(nextX, nextZ)) {
    if (!moveCandidate(nextX, state.position.z)) moveCandidate(state.position.x, nextZ);
  }
  state.facing = Math.atan2(direction.x, direction.z);
  return Math.hypot(state.position.x - previousX, state.position.z - previousZ) > .0001;
}

function updateNearby() {
  let nearest = null;
  let nearestDistance = Infinity;
  stage.locationGroups.forEach(({ location, npc }) => {
    const distance = Math.hypot(state.position.x - npc.position.x, state.position.z - npc.position.z);
    if (distance < nearestDistance) { nearest = location; nearestDistance = distance; }
  });
  state.nearbyId = nearestDistance < 2.5 ? nearest.id : null;
  elements.locationHint.hidden = !state.nearbyId;
  elements.mobileAction.classList.toggle("is-ready", Boolean(state.nearbyId));
  if (state.nearbyId) elements.locationName.textContent = `${nearest.name} · ${nearest.person}`;
}

function drawMinimap() {
  const canvas = elements.minimap;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const mapX = (x) => width / 2 + x / 23 * (width * .43);
  const mapY = (z) => height / 2 + z / 17 * (height * .42);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(60,134,137,.78)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(123,165,106,.94)";
  ctx.strokeStyle = "#1d3033";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(width / 2, height / 2, width * .42, height * .38, 0, 0, TAU); ctx.fill(); ctx.stroke();
  locations.forEach((location) => {
    ctx.fillStyle = location.id === state.nearbyId ? "#e9b94d" : "#fff8e8";
    ctx.strokeStyle = "#1d3033";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(mapX(location.position[0]), mapY(location.position[1]), location.id === state.nearbyId ? 4.5 : 2.7, 0, TAU); ctx.fill(); ctx.stroke();
  });
  ctx.save();
  ctx.translate(mapX(state.position.x), mapY(state.position.z));
  ctx.rotate(-state.facing);
  ctx.fillStyle = "#dc6849";
  ctx.strokeStyle = "#1d3033";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function chooseEncounter(locationId) {
  const pool = encounters[locationId];
  const previous = state.lastEncounter.get(locationId);
  const candidates = pool.filter((_, index) => index !== previous);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  state.lastEncounter.set(locationId, pool.indexOf(chosen));
  return chosen;
}

function interact() {
  if (state.mode !== "play" || elements.dialog.open || elements.help.open) return;
  if (!state.nearbyId) {
    showToast("靠近带 ◇ 标记的人物再交互");
    return;
  }
  openEncounter(state.nearbyId);
}

function openEncounter(locationId) {
  const location = locations.find((item) => item.id === locationId);
  const encounter = chooseEncounter(locationId);
  state.velocity.set(0, 0, 0);
  state.destination = null;
  state.pendingInteractId = null;
  stage.moveMarker.visible = false;
  state.activeEncounter = { location, encounter };
  state.activeChoice = false;
  elements.sceneVisual.style.setProperty("--scene-color", `#${new THREE.Color(location.color).getHexString()}`);
  elements.sceneCode.textContent = `${location.short.toUpperCase()} · RANDOM ENCOUNTER`;
  elements.sceneLocation.textContent = `${location.name} · ${location.person}`;
  elements.sceneTitle.textContent = encounter.title;
  elements.sceneStory.textContent = encounter.story;
  elements.sceneResult.hidden = true;
  elements.sceneResult.classList.remove("is-warning");
  elements.complete.hidden = true;
  elements.sceneChoices.innerHTML = `<legend id="scene-question">${encounter.question}</legend>`;
  encounter.choices.forEach(([label], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span>${label}`;
    button.addEventListener("click", () => answerEncounter(index));
    elements.sceneChoices.appendChild(button);
  });
  elements.dialog.showModal();
}

function answerEncounter(index) {
  if (state.activeChoice || !state.activeEncounter) return;
  state.activeChoice = true;
  const [label, result, trustDelta, minutes] = state.activeEncounter.encounter.choices[index];
  state.trust = Math.max(0, Math.min(100, state.trust + trustDelta));
  state.minutes += minutes;
  state.encounterCount += 1;
  [...elements.sceneChoices.querySelectorAll("button")].forEach((button, buttonIndex) => {
    button.disabled = true;
    button.classList.toggle("is-chosen", buttonIndex === index);
  });
  const sign = trustDelta > 0 ? "+" : "";
  elements.resultTitle.textContent = trustDelta > 0 ? `处理稳妥 · 信任 ${sign}${trustDelta}` : trustDelta < 0 ? `现场变复杂 · 信任 ${trustDelta}` : "事情暂时过去了";
  elements.resultText.textContent = `${label}。${result}`;
  elements.sceneResult.classList.toggle("is-warning", trustDelta < 0);
  elements.sceneResult.hidden = false;
  elements.complete.hidden = false;
  updateHud();
}

function closeEncounter() {
  if (!state.activeChoice) return;
  const { location, encounter } = state.activeEncounter;
  elements.dialog.close();
  elements.noteKicker.textContent = `ENCOUNTER ${String(state.encounterCount).padStart(2, "0")}`;
  elements.noteTime.textContent = location.short;
  elements.noteTitle.textContent = encounter.title;
  elements.noteBody.textContent = "这里没有完成列表。你可以继续留在附近，也可以转身去港区另一头。";
  elements.noteFooter.textContent = "下一件事，会在你靠近某个人时发生";
  state.activeEncounter = null;
  state.activeChoice = false;
  showToast("现场告一段落。接下来往哪走，由你决定。");
}

function update(delta) {
  if (state.mode !== "play" || elements.dialog.open || elements.help.open) return;
  const axes = movementAxes();
  const desired = new THREE.Vector3(axes.x, 0, axes.z);
  const hasManualInput = desired.lengthSq() > 0;
  if (hasManualInput) {
    state.destination = null;
    state.pendingInteractId = null;
    stage.moveMarker.visible = false;
  } else if (state.destination) {
    desired.copy(state.destination).sub(state.position);
    desired.y = 0;
    if (desired.length() < .28) {
      state.destination = null;
      stage.moveMarker.visible = false;
      desired.set(0, 0, 0);
    }
  }
  if (desired.lengthSq() > 1) desired.normalize();
  const targetVelocity = desired.multiplyScalar(5.55);
  state.velocity.lerp(targetVelocity, 1 - Math.exp(-11 * delta));
  if (state.velocity.lengthSq() > .025) {
    const distance = state.velocity.length() * delta;
    const moved = applyMovement(state.velocity.clone(), distance);
    if (moved) {
      state.runPhase += distance * 2.55;
      state.distanceWalked += distance;
      state.minutes += delta * .34;
      if (state.distanceWalked >= state.nextAmbientAt) {
        state.nextAmbientAt += 28 + Math.random() * 28;
        showToast(ambientMessages[Math.floor(Math.random() * ambientMessages.length)]);
      }
    } else if (state.destination) {
      state.destination = null;
      state.pendingInteractId = null;
      stage.moveMarker.visible = false;
      showToast("前面被挡住了，点另一条路绕过去");
    }
  }
  if (!state.grounded) {
    state.jumpVelocity -= 14.5 * delta;
    state.jumpHeight += state.jumpVelocity * delta;
    if (state.jumpHeight <= 0) {
      state.jumpHeight = 0;
      state.jumpVelocity = 0;
      state.grounded = true;
    }
  }
  updateNearby();
  if (!state.destination && state.pendingInteractId && state.nearbyId === state.pendingInteractId) {
    state.pendingInteractId = null;
    interact();
  }
  updateHud();
  drawMinimap();
}

function frame(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, .05);
  state.lastFrame = now;
  update(delta);
  stage?.render(now / 1000, delta);
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
elements.interact.addEventListener("click", interact);
elements.mobileAction.addEventListener("click", interact);
elements.complete.addEventListener("click", closeEncounter);
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.helpButton.addEventListener("click", () => elements.help.showModal());
elements.helpClose.addEventListener("click", () => elements.help.close());
elements.viewSwitch.addEventListener("click", toggleCameraMode);
elements.jumpButton.addEventListener("click", jump);
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.help.addEventListener("click", (event) => { if (event.target === elements.help) elements.help.close(); });
bindHold(elements.runUp, "up");
bindHold(elements.runDown, "down");
bindHold(elements.runLeft, "left");
bindHold(elements.runRight, "right");

let canvasPointerStart = null;
elements.worldCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  canvasPointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
});
elements.worldCanvas.addEventListener("pointerup", (event) => {
  if (!canvasPointerStart || event.button !== 0) return;
  const distance = Math.hypot(event.clientX - canvasPointerStart.x, event.clientY - canvasPointerStart.y);
  const duration = performance.now() - canvasPointerStart.time;
  canvasPointerStart = null;
  if (distance < 9 && duration < 650) moveFromPointer(event.clientX, event.clientY);
});
elements.worldCanvas.addEventListener("pointercancel", () => { canvasPointerStart = null; });
elements.worldCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
elements.worldCanvas.addEventListener("wheel", (event) => {
  if (state.cameraMode !== "third" || state.mode !== "play") return;
  event.preventDefault();
  state.cameraDistance = THREE.MathUtils.clamp(state.cameraDistance + Math.sign(event.deltaY) * .65, 5.4, 10.6);
}, { passive: false });

const moveCodes = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
window.addEventListener("keydown", (event) => {
  if (moveCodes.includes(event.code)) {
    event.preventDefault();
    state.keys.add(event.code);
  }
  if (event.code === "Space" && !event.repeat) { event.preventDefault(); jump(); }
  if (event.code === "KeyV" && !event.repeat && state.mode === "play" && !elements.dialog.open && !elements.help.open) toggleCameraMode();
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
  stage = new PortWorld();
  setCameraMode("third");
  elements.start.disabled = false;
  elements.start.textContent = "BEGIN";
  updateHud();
  drawMinimap();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  elements.start.textContent = "WEBGL 不可用";
  elements.start.disabled = true;
  elements.intro.querySelector(".intro-tip").textContent = "当前浏览器无法启动 3D 场景，请更新浏览器或开启硬件加速。";
}

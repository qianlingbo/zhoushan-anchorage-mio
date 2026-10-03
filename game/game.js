import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { natureUniforms, surfaceTexture, terrainMaterial, makeSky, makeOcean, makeMeadow, makeNaturalTree, makeNaturalPerson, animateNaturalPerson } from "./nature.js?v=20261003-polish-1";
import { loadAgentCharacter } from "./character.js?v=20261003-polish-1";
import { EarthAtlas } from "./earth.js?v=20261001-world-3";
import { continents, makeRegionLandmark, createRegionalVegetation } from "./regions.js?v=20261001-world-1";
import { OUTFITS, createWardrobeProgress, recordWardrobeProgress, wardrobeXP, isOutfitUnlocked, equipOutfit, serializeWardrobeProgress } from "./wardrobe.js?v=20261001-wardrobe-1";

let currentRegion = continents[0];
let selectedContinent = currentRegion.id;
const regionProgress = new Map();
let wardrobeProgress;
let wardrobeStorageAvailable = true;
const wardrobeStorageKey = "port-agent-wardrobe-v1";

const TAU = Math.PI * 2;
const WORLD_SCALE = 3;
const ISLAND_X = 21;
const ISLAND_Z = 20.5;
const PLANET_RADIUS = 32;
const PLANET_Z_SCALE = ISLAND_Z / ISLAND_X;
const PLANET_CENTER_Y = .38 - PLANET_RADIUS;
const COLORS = {
  ink: 0x182d35, cream: 0xf2eddb, paper: 0xe5ddc9, sky: 0x98c6d4,
  sea: 0x3d9d9f, seaDeep: 0x164961, grass: 0x809645, grassLight: 0xa4b667,
  grassDark: 0x456338, cliff: 0x8b8877, sand: 0xd9c79b, road: 0xb7ad90,
  orange: 0xb7623c, yellow: 0xd5ad54, blue: 0x547c95, navy: 0x293c46,
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
const homeLocations = locations.map((location) => ({ ...location }));

const discoveryNotes = {
  office: ["值班电台", "每一段现场奔波，都从一声呼叫开始。"],
  airport: ["机组行李牌", "接到人，也要接住一段新的航程。"],
  immigration: ["边检验讫章", "人员、证件和船期在这里重新对齐。"],
  customs: ["海关封识", "一枚小小封识，守住货物进出的边界。"],
  msa: ["海事罗盘", "方向正确，申报和航行才不会偏航。"],
  shipyard: ["船厂安全帽", "修造现场的第一件装备永远是安全。"],
  container: ["迷你集装箱", "箱号、车牌和计划必须严丝合缝。"],
  cargo: ["理货吊钩", "每一票货都有属于自己的数字。"],
  anchorage: ["锚地小船锚", "风浪之外，还有人在等待会合。"]
};

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
  start: $("start-button"), clock: $("clock-value"), trust: $("energy-value"), encountered: $("completed-value"), discovered: $("discoveries-value"),
  roamNote: $("mission-note"), noteKicker: $("task-sequence"), noteTime: $("task-deadline"), noteTitle: $("task-title"), noteBody: $("task-description"), noteFooter: $("task-destination"),
  locationHint: $("location-hint"), locationName: $("location-name"), interact: $("interact-button"), mobileAction: $("mobile-action"),
  runUp: $("run-up"), runDown: $("run-down"), runLeft: $("run-left"), runRight: $("run-right"), toast: $("toast"),
  viewSwitch: $("view-switch"), jumpButton: $("jump-button"), guideButton: $("guide-button"),
  discoveryCard: $("discovery-card"), discoveryName: $("discovery-name"), discoveryDescription: $("discovery-description"),
  dialog: $("scene-dialog"), sceneVisual: $("scene-visual"), sceneCode: $("scene-code"), sceneLocation: $("scene-location"), sceneTitle: $("scene-title"),
  sceneStory: $("scene-story"), sceneChoices: $("scene-choices"), sceneResult: $("scene-result"), resultTitle: $("result-title"), resultText: $("result-text"),
  complete: $("complete-button"), dialogClose: $("dialog-close"), help: $("help-dialog"), helpButton: $("help-button"), helpClose: $("help-close"),
  wardrobe: $("wardrobe-dialog"), wardrobeButton: $("wardrobe-button"), wardrobeClose: $("wardrobe-close"), wardrobeList: $("wardrobe-list"),
  wardrobeSummary: $("wardrobe-summary"), wardrobeMeter: $("wardrobe-meter"), wardrobeStorageNote: $("wardrobe-storage-note"),
  outfitPreview: $("outfit-preview"), outfitPreviewName: $("outfit-preview-name"), outfitPreviewClose: $("outfit-preview-close")
};

const state = {
  mode: "intro", position: new THREE.Vector3(-8.1, 0, -4.2), velocity: new THREE.Vector3(), facing: .85,
  keys: new Set(), holds: { up: false, down: false, left: false, right: false }, minutes: 445, trust: 72, encounterCount: 0,
  nearbyId: null, activeEncounter: null, activeChoice: false, runPhase: 0, distanceWalked: 0, nextAmbientAt: 28,
  lastEncounter: new Map(), discoveries: new Set(), lastFrame: performance.now(), toastTimer: 0, discoveryTimer: 0, destination: null, waypoints: [], pendingInteractId: null,
  guideTargetId: null, outfitUnlocks: [], outfitPreview: null,
  cameraMode: "third", cameraDistance: 11.5, cameraPitch: .36, orbitHoldUntil: 0, cameraSnap: true,
  jumpHeight: 0, jumpVelocity: 0, grounded: true
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

let random = seededRandom();

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
  const hill = 2.1 * Math.exp(-((x + 5.5) ** 2 + (z - 13) ** 2) / 28)
    + 1.55 * Math.exp(-((x - 9) ** 2 + (z - 11.5) ** 2) / 20)
    + .8 * Math.exp(-((x + 15) ** 2 + (z + 1.5) ** 2) / 16);
  const detail = (Math.sin(x * .48) * Math.cos(z * .37) + Math.sin((x + z) * .26)) * .18 * edge;
  return globeHeight(x, z) + .22 + hill * currentRegion.heightScale + detail;
}

function globeFrame(x, z, offset = 0) {
  const point = new THREE.Vector3(x, terrainHeight(x, z) + .13, z);
  const normal = new THREE.Vector3(
    terrainHeight(x - .04, z) - terrainHeight(x + .04, z), .08,
    terrainHeight(x, z - .04) - terrainHeight(x, z + .04)
  ).normalize();
  point.addScaledVector(normal, offset);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return { point, normal, quaternion };
}

function placeOnGlobe(object, x, z, heading = 0, offset = 0) {
  const { point, quaternion } = globeFrame(x, z, offset);
  object.position.copy(point);
  object.quaternion.copy(quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading));
  return object;
}

function placeOnSea(object, x, z, heading, time = 0) {
  const point = new THREE.Vector3(x, globeHeight(x, z), z);
  const normal = point.clone().sub(new THREE.Vector3(0, PLANET_CENTER_Y, 0)).normalize();
  const bob = reducedMotion.matches ? 0 : Math.sin(time * .8 + x) * .018;
  object.position.copy(point).addScaledVector(normal, bob);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading));
}

function sceneMaterial(color) {
  if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshStandardMaterial({
    color, roughness: .83, metalness: .04, map: surfaceTexture("stone")
  }));
  return materialCache.get(color);
}

function addMesh(parent, geometry, color, options = {}) {
  const mesh = new THREE.Mesh(geometry, sceneMaterial(color));
  const { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], outline = false, outlineScale = 1.028, shadow = true } = options;
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
  const person = makeNaturalPerson(options, () => makeMarker());
  person.scale.setScalar(1 / WORLD_SCALE);
  return person;
}

function animatePerson(person, phase, amount, time) {
  animateNaturalPerson(person, phase, amount, time);
}

function makeTree(scale = 1) {
  return createRegionalVegetation(currentRegion, random, scale)
    || makeNaturalTree(random, scale, currentRegion.id === "asia" && random() > .46);
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
  texture.userData.regionOwned = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
  sprite.scale.set(1.62, 0.41, 1);
  return sprite;
}

function addWindow(group, x, y, z, color = 0x9fc7c2) {
  const glass = addMesh(group, new THREE.BoxGeometry(0.3, 0.36, 0.05), color, { position: [x, y, z] });
  glass.material = new THREE.MeshStandardMaterial({ color: 0x527d8b, roughness: .18, metalness: .35 });
  addMesh(group, new THREE.BoxGeometry(0.025, 0.34, 0.06), COLORS.cream, { position: [x, y, z + .035], outline: false, shadow: false });
}

function addContainer(group, x, y, z, color, rotationY = 0) {
  const container = new THREE.Group();
  addMesh(container, new THREE.BoxGeometry(1.32, .58, .72), color, { position: [0, 0, 0], outlineScale: 1.022 });
  const ridgeColor = new THREE.Color(color).multiplyScalar(.8).getHex();
  Array.from({ length: 13 }, (_, i) => -.57 + i * .095).forEach((ridgeX) => addMesh(container, new THREE.BoxGeometry(.019, .48, .028), ridgeColor, {
    position: [ridgeX, 0, .372], outline: false, shadow: false
  }));
  [-.2, .2].forEach((doorZ) => {
    addMesh(container, new THREE.BoxGeometry(.026, .5, .31), ridgeColor, { position: [.67, 0, doorZ] });
    addMesh(container, new THREE.CylinderGeometry(.01, .01, .48, 6), COLORS.cream, { position: [.692, 0, doorZ] });
  });
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
  if (["office", "msa", "customs", "immigration", "airport", "shipyard"].includes(kind)) {
    const halfWidth = kind === "airport" ? 1.95 : kind === "shipyard" ? 1.65 : ["office", "msa"].includes(kind) ? 1.375 : 1.725;
    const halfDepth = kind === "shipyard" ? 1.1 : ["immigration", "customs"].includes(kind) ? 1 : .9;
    const y = ["office", "msa"].includes(kind) ? 1.42 : .9;
    [-1, 1].forEach((side) => {
      const wall = new THREE.Group();
      wall.rotation.y = side * Math.PI / 2;
      [-.48, .48].forEach((x) => addWindow(wall, x, y, halfWidth + .035));
      group.add(wall);
    });
    const back = new THREE.Group();
    back.rotation.y = Math.PI;
    [-.75, 0, .75].forEach((x) => addWindow(back, x, y, halfDepth + .035));
    group.add(back);
    addMesh(group, new THREE.BoxGeometry(halfWidth * 2 + .08, .08, halfDepth * 2 + .08), 0xb1aaa0, { position: [0, .08, 0] });
    addMesh(group, new THREE.BoxGeometry(halfWidth * 2 + .03, .035, halfDepth * 2 + .03), 0xc6c3b0, { position: [0, .29, 0] });
    if (kind !== "shipyard" && kind !== "airport") {
      // Recessed entrance and shallow steps give the facade a human scale.
      addMesh(group, new THREE.BoxGeometry(.83, .08, .48), 0xaaa895, { position: [0, .035, halfDepth + .19] });
      addMesh(group, new THREE.BoxGeometry(.74, .07, .26), 0xc5c0ad, { position: [0, .105, halfDepth + .12] });
      addMesh(group, new THREE.BoxGeometry(.88, .055, .48), COLORS.cream, { position: [0, 1.1, halfDepth + .15] });
      [-.29, .29].forEach((side) => addMesh(group, new THREE.BoxGeometry(.035, .99, .045), 0xc6c3b0, { position: [side, .57, halfDepth + .085] }));
    }
  }
  return group;
}

function makeBoat(color, scale = 1) {
  const group = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.05, -.6); hullShape.lineTo(1.45, -.6); hullShape.quadraticCurveTo(2.05, -.35, 2.35, 0);
  hullShape.quadraticCurveTo(2.05, .35, 1.45, .6); hullShape.lineTo(-2.05, .6); hullShape.closePath();
  addMesh(group, new THREE.ExtrudeGeometry(hullShape, { depth: .48, bevelEnabled: true, bevelThickness: .09, bevelSize: .09, bevelSegments: 3, steps: 1 }), 0x283f4a, { position: [0, .38, 0], rotation: [Math.PI / 2, 0, 0] });
  addMesh(group, new THREE.BoxGeometry(3.5, .09, 1.15), COLORS.cream, { position: [-.15, .46, 0] });
  addMesh(group, new THREE.BoxGeometry(1.45, .8, .98), color, { position: [-.35, .92, 0] });
  addMesh(group, new THREE.BoxGeometry(1.75, .1, 1.15), COLORS.cream, { position: [-.35, 1.38, 0] });
  [-.78, -.32, .14].forEach((x) => addWindow(group, x, 1.06, .52));
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 8; i += 1) addMesh(group, new THREE.CylinderGeometry(.012, .012, .32, 6), COLORS.cream, { position: [-1.85 + i * .49, .66, side * .6], shadow: false });
    addMesh(group, new THREE.BoxGeometry(3.7, .018, .018), COLORS.cream, { position: [-.12, .84, side * .6] });
    const lifering = addMesh(group, new THREE.TorusGeometry(.17, .04, 8, 20), COLORS.orange, { position: [-.6, .85, side * .54] });
    lifering.rotation.y = side * Math.PI / 2;
  });
  addMesh(group, new THREE.CylinderGeometry(.022, .03, 1.1, 8), COLORS.cream, { position: [-.35, 1.94, 0] });
  addMesh(group, new THREE.BoxGeometry(.75, .04, .035), COLORS.cream, { position: [-.35, 2.2, 0] });
  group.scale.setScalar(scale);
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

function makeCollectible(location, index) {
  const group = new THREE.Group();
  const shapes = [
    new THREE.BoxGeometry(.34, .42, .22),
    new THREE.ConeGeometry(.27, .5, 5),
    new THREE.CylinderGeometry(.25, .25, .22, 10),
    new THREE.DodecahedronGeometry(.28, 0)
  ];
  addMesh(group, shapes[index % shapes.length], location.color, { position: [0, .44, 0], rotation: [0, index * .37, 0], outlineScale: 1.06 });
  addMesh(group, new THREE.TorusGeometry(.39, .035, 7, 22), COLORS.yellow, { position: [0, .44, 0], rotation: [Math.PI / 2, 0, 0], outlineScale: 1.04, shadow: false });
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(.48, .56, 28),
    new THREE.MeshBasicMaterial({ color: COLORS.cream, transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = .08;
  group.add(halo);
  group.userData.halo = halo;
  group.userData.phase = index * .83;
  return group;
}

function makeMoveMarker() {
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(.10, .135, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.orange, transparent: true, opacity: .88, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  marker.add(ring);
  [-1, 1].forEach((direction) => {
    const stroke = new THREE.Mesh(new THREE.BoxGeometry(.09, .018, .018), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
    stroke.rotation.y = Math.PI / 4 * direction;
    marker.add(stroke);
  });
  return marker;
}

function makeGuideSpirit() {
  const group = new THREE.Group();
  group.name = "sea-breeze-bird";
  const materials = new Map();
  const feather = (parent, color, position, scale) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .76 }));
    const part = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), materials.get(color));
    part.position.set(...position); part.scale.set(...scale);
    part.castShadow = part.receiveShadow = true;
    parent.add(part);
    return part;
  };
  const body = new THREE.Group(); group.add(body);
  feather(body, 0xe9efdf, [0, 0, -.025], [.205, .225, .235]);
  feather(body, 0xfff4dc, [0, -.02, .14], [.16, .17, .12]);
  feather(body, 0xe9efdf, [0, .15, .075], [.182, .18, .173]);
  const eyes = [], eyeHighlights = [];
  [-1, 1].forEach((side) => {
    const eye = feather(body, 0x202f35, [side * .083, .18, .224], [.028, .034, .017]);
    eyes.push(eye);
    eyeHighlights.push(feather(body, 0xffffff, [side * .08 - .007, .19, .239], [.007, .008, .004]));
    feather(body, 0xe6a69b, [side * .12, .115, .215], [.031, .016, .01]);
    const crest = feather(body, 0x75a8a4, [side * .032, .322, .045], [.028, .065, .035]);
    crest.rotation.z = side * -.3;
    feather(body, 0xdca75f, [side * .065, -.23, .02], [.036, .022, .066]);
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.043, .09, 16), new THREE.MeshStandardMaterial({ color: 0xe4ad58, roughness: .55 }));
  beak.position.set(0, .137, .264); beak.rotation.x = Math.PI / 2;
  body.add(beak);
  const wings = [];
  [-1, 1].forEach((side) => {
    const wing = new THREE.Group(); wing.position.set(side * .17, .04, -.025); group.add(wing);
    feather(wing, 0x79aaa5, [side * .125, -.01, -.025], [.18, .054, .15]);
    for (let index = 0; index < 3; index++) {
      const plume = feather(wing, index % 2 ? 0xa5c6b8 : 0x649995,
        [side * (.24 - index * .035), -.008, -.09 + index * .088], [.145 - index * .018, .027, .052]);
      plume.rotation.y = side * (.18 + index * .12);
    }
    wings.push(wing);
  });
  const tailFeathers = [-1, 0, 1].map((side) => {
    const tail = feather(group, side ? 0x79aaa5 : 0xa5c6b8, [side * .065, -.05, -.267], [.048, .028, .145]);
    tail.rotation.y = side * -.28;
    return tail;
  });
  Object.assign(group.userData, { body, eyes, eyeHighlights, beak, leftWing: wings[0], rightWing: wings[1], tailFeathers, followPosition: new THREE.Vector2() });
  return group;
}

function animateGuideSpirit(bird, time, movement = 0, reduceMotion = false) {
  const { body, eyes, eyeHighlights, leftWing, rightWing, tailFeathers } = bird.userData;
  const flap = reduceMotion ? .16 : .16 + Math.sin(time * (8 + movement * 3)) * .5;
  leftWing.rotation.z = -flap; rightWing.rotation.z = flap;
  body.rotation.x = reduceMotion ? 0 : -movement * .1;
  body.rotation.z = reduceMotion ? 0 : Math.sin(time * 2) * .025;
  tailFeathers.forEach((tail) => { tail.rotation.x = reduceMotion ? 0 : Math.sin(time * 3.2) * .08; });
  const blink = !reduceMotion && time % 5.7 > 5.55;
  eyes.forEach((eye) => { eye.scale.y = blink ? .004 : .034; });
  eyeHighlights.forEach((highlight) => { highlight.visible = !blink; });
}

class PortWorld {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(COLORS.sky, 105, 320);
    this.sky = makeSky();
    this.scene.add(this.sky);
    this.world = new THREE.Group();
    this.world.scale.setScalar(WORLD_SCALE);
    this.world.updateMatrixWorld();
    this.scene.add(this.world);
    this.camera = new THREE.PerspectiveCamera(52, 1, .08, 550);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.cameraYaw = state.facing;
    this.renderers = new Map();
    [["intro", elements.titleCanvas], ["play", elements.worldCanvas]].forEach(([name, canvas]) => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.5 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderers.set(name, renderer);
    });
    this.atlas = new EarthAtlas(continents);
    const hemisphere = new THREE.HemisphereLight(0xb9d8ee, 0x655b40, 1.15);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffe4b5, 2.8);
    sun.position.set(-24, 32, 23).multiplyScalar(WORLD_SCALE);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = .035;
    sun.shadow.camera.far = 300;
    this.scene.add(sun);
    this.locationGroups = new Map();
    this.collectibles = new Map();
    this.ambientPeople = [];
    this.walkSurfaces = [];
    this.craneMotions = [];
    this.roadPaths = [];
    this.birds = [];
    this.boats = [];
    this.player = makePerson({ jacket: 0x598486, trousers: 0x3b4c60, skin: 0xe0b38e, hair: 0x151b20, face: "east-asian", hairStyle: "short", bag: true });
    this.player.userData.rig.scale.setScalar(.86);
    this.player.userData.head.scale.setScalar(1.08);
    this.world.add(this.player);
    this.guideSpirit = makeGuideSpirit();
    this.guideSpirit.visible = false;
    this.world.add(this.guideSpirit);
    this.moveMarker = makeMoveMarker();
    this.moveMarker.visible = false;
    this.world.add(this.moveMarker);
    this.setRegion(currentRegion);
    this.resize();
  }

  setRegion(region) {
    const persistent = new Set([this.player, this.guideSpirit, this.moveMarker]);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    const remove = (object) => {
      object.traverse((part) => {
        if (part.geometry) geometries.add(part.geometry);
        if (part.isInstancedMesh) part.dispose();
        if (part.material) (Array.isArray(part.material) ? part.material : [part.material]).forEach((material) => {
          materials.add(material);
          if (material.map?.userData.regionOwned) textures.add(material.map);
        });
      });
      object.removeFromParent();
    };
    [...this.world.children].filter((object) => !persistent.has(object)).forEach(remove);
    this.birds.forEach(remove);
    geometries.forEach((geometry) => geometry.dispose());
    const sharedMaterials = new Set(materialCache.values());
    materials.forEach((material) => { if (!sharedMaterials.has(material)) material.dispose(); });
    textures.forEach((texture) => texture.dispose());
    this.locationGroups.clear(); this.collectibles.clear();
    this.ambientPeople = []; this.walkSurfaces = []; this.craneMotions = [];
    this.roadPaths = []; this.birds = []; this.boats = [];
    colliders.length = 0;
    random = seededRandom(7823 + continents.indexOf(region) * 137);
    Object.entries(region.ground).forEach(([name, color]) => natureUniforms[name].value.set(color));
    this.scene.fog.color.set(region.climate === "polar" ? 0xcddde3 : COLORS.sky);
    this.sky.material.uniforms.uHorizon.value.copy(this.scene.fog.color);
    this.buildWorld();
  }

  makeIsland(radius, kind, offset, scaleZ = PLANET_Z_SCALE) {
    const radialSegments = 72;
    const angularSegments = 128;
    const vertices = [];
    const uvs = [];
    const indices = [];
    for (let ring = 0; ring <= radialSegments; ring += 1) {
      for (let segment = 0; segment <= angularSegments; segment += 1) {
        const angle = segment / angularSegments * TAU;
        const coast = Math.sin(angle * 5) * .28 + Math.sin(angle * 9) * .18;
        const ringRadius = (radius + coast * (ring / radialSegments) ** 3) * ring / radialSegments;
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius * scaleZ;
        vertices.push(x, terrainHeight(x, z) + offset, z);
        uvs.push(x / 2, z / 2);
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
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, terrainMaterial(kind));
    mesh.receiveShadow = true;
    return mesh;
  }

  addRoad(points, width = .56) {
    const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", .18);
    const vertices = [], uvs = [], indices = [], path = [];
    for (let step = 0; step <= 128; step += 1) {
      const t = step / 128;
      const point = curve.getPoint(t), tangent = curve.getTangent(t);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      path.push(new THREE.Vector2(point.x, point.z));
      [-1, 1].forEach((sign) => {
        const x = point.x + side.x * width * sign;
        const z = point.z + side.z * width * sign;
        vertices.push(x, terrainHeight(x, z) + .155, z);
        uvs.push(sign === -1 ? 0 : 1, t * 24);
      });
      if (step < 128) { const a = step * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: .96, map: surfaceTexture("stone"), side: THREE.DoubleSide }));
    road.receiveShadow = true;
    this.world.add(road);
    this.roadPaths.push({ path, width });
  }

  buildWorld() {
    const water = makeOcean(PLANET_RADIUS, PLANET_CENTER_Y, PLANET_Z_SCALE, WORLD_SCALE);
    this.world.add(water);
    const soil = this.makeIsland(21.15, "rock", -.16);
    const sand = this.makeIsland(20.85, "sand", .04);
    const grass = this.makeIsland(18.9, "grass", .13);
    this.world.add(soil, sand, grass);
    this.walkSurfaces.push(sand, grass);
    this.addRoad([[0, 8.2], [-6.5, 8], [-14.4, 8]]);
    this.addRoad([[-14.4, 8], [-11, 5.4], [-9.2, 2.3], [-2.2, -1.7], [3.7, 3.3], [9, 5.5], [13.8, 7.4]]);
    this.addRoad([[3.7, 3.3], [8.4, .3], [14, -3.1], [9.2, -8], [4.7, -11], [-3.8, -10], [-11.2, -10]]);
    this.addRoad([[-11.2, -10], [-8.1, -4.2], [-2.2, -1.7]]);
    locations.forEach((location, index) => {
      const [x, z] = location.position;
      const building = makeBuilding(location);
      building.scale.setScalar(.8);
      placeOnGlobe(building, x, z, (index % 3 - 1) * .08);
      this.world.add(building);
      const label = makeLabel(location.short, location.color);
      label.scale.multiplyScalar(.55);
      placeOnGlobe(label, x, z, 0, 2.9);
      this.world.add(label);
      const personStyle = currentRegion.people[index % currentRegion.people.length];
      const npc = makePerson({
        ...personStyle, jacket: location.color, bag: index % 2 === 0,
        hat: ["shipyard", "container", "cargo"].includes(location.kind), marker: true
      });
      const [npcX, npcZ] = location.interact;
      placeOnGlobe(npc, npcX, npcZ, Math.atan2(x - npcX, z - npcZ) + Math.PI);
      npc.userData.anchor = new THREE.Vector2(npcX, npcZ);
      npc.userData.phase = index * 1.7;
      npc.userData.wanderRadius = .24 + (index % 3) * .11;
      this.world.add(npc);
      this.locationGroups.set(location.id, { location, building, label, npc, marker: npc.userData.marker });
      const collectible = makeCollectible(location, index);
      collectible.scale.setScalar(1 / WORLD_SCALE);
      const collectibleAngle = index * 2.17 + .55;
      const collectibleX = npcX + Math.sin(collectibleAngle) * 1.35;
      const collectibleZ = npcZ + Math.cos(collectibleAngle) * 1.35;
      placeOnGlobe(collectible, collectibleX, collectibleZ, collectibleAngle, .24);
      this.world.add(collectible);
      this.collectibles.set(location.id, { location, object: collectible, x: collectibleX, z: collectibleZ });
      colliders.push({ x, z, radius: ["container", "cargo"].includes(location.kind) ? 2.1 : 1.65 });
    });

    const terminalPad = addMesh(this.world, new THREE.BoxGeometry(6.6, .22, 3.7), 0x6e7168, { outlineScale: 1.015 });
    placeOnGlobe(terminalPad, 14.6, -9.1, .12, .02);
    const quayCrane = makeQuayCrane(COLORS.orange);
    placeOnGlobe(quayCrane, 15.2, -9.2, .54, .14);
    quayCrane.scale.setScalar(1.65);
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
    placeOnGlobe(yardStacks, 10.4, -5.7, -.08);
    this.world.add(yardStacks);
    const yardGantry = makeYardGantry();
    placeOnGlobe(yardGantry, 10.4, -5.7, -.08, .04);
    yardGantry.scale.setScalar(1.08);
    this.world.add(yardGantry);
    colliders.push({ x: 10.4, z: -5.7, radius: 1.55 });

    const cargoCrane = makeQuayCrane(COLORS.yellow);
    placeOnGlobe(cargoCrane, 5.1, -13, 1.2, .04);
    cargoCrane.scale.setScalar(1.1);
    this.world.add(cargoCrane);
    this.craneMotions.push({ crane: cargoCrane, phase: Math.PI * .75 });

    [[-17.1, -7.2, COLORS.orange, .15], [-13.3, -10.2, COLORS.yellow, -.4], [-17.8, 5.6, COLORS.blue, .42]].forEach(([x, z, color, rotation]) => {
      const umbrella = makeBeachUmbrella(color);
      placeOnGlobe(umbrella, x, z, rotation, .06);
      umbrella.scale.setScalar(.82);
      this.world.add(umbrella);
    });
    const beachFlag = new THREE.Group();
    addMesh(beachFlag, new THREE.CylinderGeometry(.025, .035, 1.8, 7), COLORS.ink, { position: [0, .9, 0], outline: false });
    addMesh(beachFlag, new THREE.BoxGeometry(.58, .3, .025), COLORS.orange, { position: [.29, 1.56, 0], outlineScale: 1.02 });
    placeOnGlobe(beachFlag, -18.1, -3.8);
    this.world.add(beachFlag);

    const treePositions = [
      [-16, -2, 1], [-12, 11.5, 1.05], [-8, 10.5, 1.15], [-4.5, 12, 1.3],
      [-4, 4.4, .85], [-.7, 11.3, 1.18], [3, 11.2, 1], [7.2, 9.6, 1.25], [10, 11.2, 1.08], [17.3, 4.5, 1.2],
      [18, -1, 1], [.2, -13.2, 1], [-6, -12.3, 1.25],
      [-13.5, -3, .9], [-7, -1, .78], [7.3, 7, .8], [7.6, -3.5, .78], [.5, 3.3, .72]
    ];
    treePositions.forEach(([x, z, scale]) => {
      const tree = makeTree(scale);
      placeOnGlobe(tree, x, z, random() * .3 - .15);
      this.world.add(tree);
      colliders.push({ x, z, radius: .12 * scale });
    });
    const clearMeadow = (x, z) => Math.hypot(x + 6.5, z + 5.8) > .9
      && !colliders.some((item) => Math.hypot(x - item.x, z - item.z) < item.radius + .65)
      && !this.roadPaths.some(({ path, width }) => path.some((point) => Math.hypot(x - point.x, z - point.y) < width + .15));
    if (currentRegion.climate !== "polar") this.world.add(makeMeadow(globeFrame, clearMeadow, random, natureUniforms.light.value, currentRegion.climate === "arid" ? .18 : 1));
    for (let index = 0; index < 20; index += 1) {
      const x = -11 + random() * 22, z = 10 + random() * 6;
      if (!insideIsland(x, z) || !clearMeadow(x, z)) continue;
      const tree = makeTree(.6 + random() * .5);
      placeOnGlobe(tree, x, z, random() * TAU);
      this.world.add(tree);
      colliders.push({ x, z, radius: .12 });
    }
    for (let index = 0; index < 25; index += 1) {
      const angle = random() * TAU;
      const radius = 8 + random() * 11.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * .72;
      if (!clearMeadow(x, z) || Math.hypot(x + 8.1, z + 4.2) < 1.2
        || locations.some((location) => Math.hypot(x - location.interact[0], z - location.interact[1]) < 1.3)) continue;
      const rock = new THREE.Group();
      const radiusRock = .16 + random() * .27;
      addMesh(rock, new THREE.IcosahedronGeometry(radiusRock, 1), index % 3 ? 0x828477 : 0x9b927b, { scale: [1.4, .7, 1] });
      placeOnGlobe(rock, x, z, random() * TAU, radiusRock * .5);
      this.world.add(rock);
      colliders.push({ x, z, radius: radiusRock * .9 });
    }
    for (let index = 0; index < 10; index += 1) {
      const angle = index / 10 * TAU;
      const radius = 10.5 + (index % 3) * 2.8;
      const person = makePerson({
        ...currentRegion.people[(index + 2) % currentRegion.people.length], bag: index % 3 === 0
      });
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * .68;
      placeOnGlobe(person, x, z, angle + Math.PI);
      person.userData.anchor = new THREE.Vector2(x, z);
      person.userData.phase = index * .73;
      person.userData.wanderRadius = .7 + (index % 3) * .35;
      this.world.add(person);
      this.ambientPeople.push(person);
    }
    const westPier = addMesh(this.world, new THREE.BoxGeometry(3.5, .28, 5.4), 0x85664f, { outlineScale: 1.02 });
    placeOnGlobe(westPier, -10.6, -13.2, .04, -.02);
    westPier.receiveShadow = true;
    const eastPier = addMesh(this.world, new THREE.BoxGeometry(4.1, .28, 5.6), 0x85664f, { outlineScale: 1.02 });
    placeOnGlobe(eastPier, 8.3, -13.5, -.05, -.02);
    eastPier.receiveShadow = true;
    [[-13.8, -16.5, -.35, COLORS.blue], [15.8, -14.5, .85, COLORS.orange]].forEach(([x, z, heading, color]) => {
      const boat = makeBoat(color, 1.05);
      placeOnSea(boat, x, z, heading);
      this.world.add(boat);
      this.boats.push({ boat, x, z, heading });
    });
    [[-25, -9, 4.2], [26, -5, 5.4], [-20, 21, 4.5], [21, 21, 4.8]].forEach(([x, z, scale]) => {
      const island = new THREE.Group();
      addMesh(island, new THREE.IcosahedronGeometry(scale, 2), 0x657e6c, { scale: [1.4, .58, 1] });
      island.position.set(x, globeHeight(x, z) + .25, z);
      this.world.add(island);
    });
    this.addPortDetails();
    const landmark = makeRegionLandmark(currentRegion);
    placeOnGlobe(landmark, -5, 13, .2);
    this.world.add(landmark);
    colliders.push({ x: -5, z: 13, radius: 1.55 });
    const landmarkLabel = makeLabel(currentRegion.landmarkName, currentRegion.color);
    placeOnGlobe(landmarkLabel, -5, 13, 0, 4.2);
    landmarkLabel.scale.multiplyScalar(.9);
    this.world.add(landmarkLabel);
    this.portal = new THREE.Group();
    const portalRing = new THREE.Mesh(new THREE.TorusGeometry(.58, .045, 8, 48), new THREE.MeshStandardMaterial({ color: 0xe4c47c, emissive: 0x806731, emissiveIntensity: .8, roughness: .25, metalness: .6 }));
    portalRing.position.y = .7;
    this.portal.add(portalRing);
    addMesh(this.portal, new THREE.CylinderGeometry(.7, .75, .08, 32), 0x456774, { position: [0, .02, 0] });
    const portalLabel = makeLabel("环球传送", 0xd5ad54);
    portalLabel.position.y = 1.55; portalLabel.scale.multiplyScalar(.6);
    this.portal.add(portalLabel);
    placeOnGlobe(this.portal, -6.5, -5.8, .85);
    this.world.add(this.portal);
    this.collectibles.forEach((item) => {
      if (!collides(item.x, item.z)) return;
      const npc = this.locationGroups.get(item.location.id).npc;
      for (let i = 0; i < 32; i += 1) {
        const angle = i / 32 * TAU;
        const x = npc.position.x + Math.sin(angle) * 1.05;
        const z = npc.position.z + Math.cos(angle) * 1.05;
        if (!insideIsland(x, z) || collides(x, z)) continue;
        item.x = x; item.z = z;
        placeOnGlobe(item.object, x, z, 0, .3);
        break;
      }
    });
  }

  addPortDetails() {
    const lighthouse = new THREE.Group();
    addMesh(lighthouse, new THREE.CylinderGeometry(.42, .65, 3.3, 24), COLORS.cream, { position: [0, 1.65, 0] });
    addMesh(lighthouse, new THREE.CylinderGeometry(.48, .51, .65, 24), COLORS.orange, { position: [0, 2.32, 0] });
    addMesh(lighthouse, new THREE.CylinderGeometry(.48, .48, .52, 16), COLORS.blue, { position: [0, 3.52, 0] });
    addMesh(lighthouse, new THREE.ConeGeometry(.75, .42, 24), COLORS.navy, { position: [0, 3.99, 0] });
    addMesh(lighthouse, new THREE.TorusGeometry(.74, .025, 6, 32), COLORS.cream, { position: [0, 3.25, 0], rotation: [Math.PI / 2, 0, 0] });
    placeOnGlobe(lighthouse, -4.3, -17.7, 0);
    this.world.add(lighthouse);

    // Quay furniture anchors the industrial scale: bollards, fenders, railings.
    [[-10.6, -13.2], [8.3, -13.5], [14.6, -9.1]].forEach(([x, z], pierIndex) => {
      const details = new THREE.Group();
      [-1, 1].forEach((side) => {
        for (let i = 0; i < 5; i += 1) {
          addMesh(details, new THREE.CylinderGeometry(.055, .07, .8, 8), 0x809297, { position: [side * 1.6, .38, -2.2 + i * 1.1] });
          if (i % 2 === 0) addMesh(details, new THREE.CylinderGeometry(.12, .15, .2, 10), COLORS.navy, { position: [side * 1.42, .14, -2.2 + i * 1.1] });
        }
        addMesh(details, new THREE.BoxGeometry(.045, .045, 4.6), 0xa6b3ad, { position: [side * 1.6, .79, 0] });
        const tire = addMesh(details, new THREE.TorusGeometry(.24, .08, 8, 20), 0x333b3c, { position: [side * 1.8, -.13, -1.4] });
        tire.rotation.y = Math.PI / 2;
      });
      placeOnGlobe(details, x, z, pierIndex === 2 ? .12 : 0);
      this.world.add(details);
    });

    for (let i = 0; i < 6; i += 1) {
      const bird = new THREE.Group();
      [-1, 1].forEach((side) => {
        const wing = addMesh(bird, new THREE.SphereGeometry(1, 8, 6), COLORS.cream, { position: [side * .18, 0, 0], scale: [.27, .025, .08], shadow: false });
        wing.rotation.z = side * .12;
      });
      bird.userData.phase = i * 1.4;
      this.scene.add(bird);
      this.birds.push(bird);
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
    return hits.length ? this.world.worldToLocal(hits[0].point.clone()) : null;
  }

  clickedLocation(clientX, clientY) {
    const rect = elements.worldCanvas.getBoundingClientRect();
    let closest = null;
    let closestDistance = rect.width < 760 ? 44 : 38;
    this.locationGroups.forEach(({ location, npc }) => {
      const screen = npc.localToWorld(new THREE.Vector3(0, 1.05, 0)).project(this.camera);
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
    placeOnGlobe(this.moveMarker, point.x, point.z, 0, .08);
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
      placeOnGlobe(npc, x, z, Math.abs(dx) + Math.abs(dz) > .0001 ? Math.atan2(dx, dz) : 0);
      animatePerson(npc, time * 2.15 + phase, .22, time);
      const near = state.nearbyId === id;
      const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(time * 3 + phase) * .08;
      npc.userData.marker.scale.setScalar(near ? 1.32 : pulse);
      npc.userData.marker.position.y = 2.12 + (reducedMotion.matches ? 0 : Math.sin(time * 2.4 + phase) * .08);
      const labelDistance = Math.hypot(state.position.x - location.position[0], state.position.z - location.position[1]);
      label.visible = state.mode === "play" && labelDistance < 9;
    });
    this.ambientPeople.forEach((person, index) => {
      const { anchor, phase, wanderRadius } = person.userData;
      const x = anchor.x + Math.sin(time * .22 + phase) * wanderRadius;
      const z = anchor.y + Math.cos(time * .18 + phase) * wanderRadius;
      const dx = x - person.position.x;
      const dz = z - person.position.z;
      placeOnGlobe(person, x, z, Math.atan2(dx, dz));
      animatePerson(person, time * 1.65 + index, .28, time);
    });
  }

  render(time, delta) {
    if (state.mode === "intro") {
      this.atlas.render(this.renderers.get("intro"), reducedMotion.matches ? 0 : time, reducedMotion.matches ? 1 : delta, window.innerWidth, window.innerHeight);
      this.atlas.getNodeScreenPositions(window.innerWidth, window.innerHeight).forEach(({ id, x, y, visible }) => {
        const button = document.querySelector(`[data-earth-node="${id}"]`);
        if (!button) return;
        button.hidden = !visible;
        button.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      });
      return;
    }
    natureUniforms.time.value = time;
    natureUniforms.wind.value = reducedMotion.matches ? 0 : 1;
    natureUniforms.player.value.copy(this.player.getWorldPosition(new THREE.Vector3()));
    this.updatePeople(time);
    this.boats.forEach(({ boat, x, z, heading }) => placeOnSea(boat, x, z, heading, time));
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
    this.birds.forEach((bird) => {
      const phase = bird.userData.phase;
      const angle = reducedMotion.matches ? phase : time * .065 + phase;
      bird.position.set(Math.cos(angle) * 18, 7 + Math.sin(angle * 2) * 1.3, Math.sin(angle) * 20).multiplyScalar(WORLD_SCALE);
      bird.rotation.y = -angle;
      bird.children.forEach((wing, index) => { wing.rotation.z = (index ? 1 : -1) * (reducedMotion.matches ? .1 : .12 + Math.sin(time * 2.8 + phase) * .22); });
    });
    this.collectibles.forEach(({ object, x, z }, id) => {
      object.visible = !state.discoveries.has(id);
      if (!object.visible) return;
      const phase = object.userData.phase;
      const bob = reducedMotion.matches ? .3 : .3 + Math.sin(time * 2.1 + phase) * .12;
      placeOnGlobe(object, x, z, reducedMotion.matches ? phase : time * .65 + phase, bob);
      if (!reducedMotion.matches) {
        const pulse = 1 + Math.sin(time * 2.6 + phase) * .08;
        object.userData.halo.scale.setScalar(pulse);
      }
    });
    this.player.visible = state.mode === "play";
    this.guideSpirit.visible = state.mode === "play";
    if (state.mode === "play") {
      const guideTarget = state.guideTargetId ? locations.find((location) => location.id === state.guideTargetId) : null;
      const guideAngle = guideTarget
        ? Math.atan2(guideTarget.interact[0] - state.position.x, guideTarget.interact[1] - state.position.z)
        : state.facing + .85 + (state.outfitPreview ? Math.PI : 0);
      const guideDistance = guideTarget ? .9 : .6;
      let guideX = state.position.x + Math.sin(guideAngle) * guideDistance;
      let guideZ = state.position.z + Math.cos(guideAngle) * guideDistance;
      if (!insideIsland(guideX, guideZ)) {
        guideX = state.position.x - Math.sin(guideAngle) * .85;
        guideZ = state.position.z - Math.cos(guideAngle) * .85;
      }
      const movement = Math.min(state.velocity.length() / 1.75, 1);
      const guideFollow = this.guideSpirit.userData.followPosition;
      if (state.cameraSnap || reducedMotion.matches) guideFollow.set(guideX, guideZ);
      else guideFollow.lerp(new THREE.Vector2(guideX, guideZ), 1 - Math.exp(-7.2 * delta));
      const guideLift = .5 + state.jumpHeight / WORLD_SCALE * .4 + (reducedMotion.matches ? 0 : Math.sin(time * 3.1) * .025);
      placeOnGlobe(this.guideSpirit, guideFollow.x, guideFollow.y, guideTarget ? guideAngle : state.facing + Math.PI, guideLift);
      this.guideSpirit.scale.setScalar(.9 / WORLD_SCALE);
      animateGuideSpirit(this.guideSpirit, time, movement, reducedMotion.matches);
      animatePerson(this.player, state.runPhase, movement, time);
      this.agentCharacter?.update(delta, movement, !state.grounded);
      if (!state.grounded) {
        const tuck = Math.min(state.jumpHeight * .55, .38);
        this.player.userData.leftArm.rotation.x = -1.05;
        this.player.userData.rightArm.rotation.x = -1.05;
        this.player.userData.leftLeg.rotation.x += tuck;
        this.player.userData.rightLeg.rotation.x += tuck;
        this.player.userData.leftKnee.rotation.x = .6;
        this.player.userData.rightKnee.rotation.x = .6;
      }
      const surface = globeFrame(state.position.x, state.position.z, state.jumpHeight / WORLD_SCALE);
      const localYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.facing);
      this.player.position.copy(surface.point);
      this.player.quaternion.copy(surface.quaternion).multiply(localYaw);
      surface.point.applyMatrix4(this.world.matrixWorld);
      const yawLerp = state.cameraSnap || reducedMotion.matches ? 1 : 1 - Math.exp(-2.6 * delta);
      if (performance.now() > state.orbitHoldUntil) this.cameraYaw = lerpAngle(this.cameraYaw, state.facing, yawLerp);
      const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw)).applyQuaternion(surface.quaternion).normalize();
      const cameraLerp = state.cameraSnap || reducedMotion.matches ? 1 : 1 - Math.exp(-7.2 * delta);
      this.camera.up.lerp(surface.normal, cameraLerp).normalize();
      if (state.cameraMode === "first") {
        const eye = surface.point.clone().addScaledVector(surface.normal, 1.48).addScaledVector(forward, .08);
        this.camera.position.lerp(eye, cameraLerp);
        this.camera.lookAt(eye.clone().addScaledVector(forward, Math.cos(state.cameraPitch) * 14).addScaledVector(surface.normal, Math.sin(state.cameraPitch) * 14));
        this.player.visible = false;
      } else {
        const mobile = window.innerWidth < 760;
        const distance = mobile && !state.outfitPreview ? state.cameraDistance + 1.1 : state.cameraDistance;
        const desired = surface.point.clone()
          .addScaledVector(forward, -Math.cos(state.cameraPitch) * distance)
          .addScaledVector(surface.normal, Math.sin(state.cameraPitch) * distance + 1.7);
        const focus = surface.point.clone()
          .addScaledVector(surface.normal, state.outfitPreview ? .9 : 1.1)
          .addScaledVector(forward, state.outfitPreview ? 0 : 1.4);
        if (Math.hypot(desired.x, desired.z / PLANET_Z_SCALE) < 28 * WORLD_SCALE) {
          desired.y = Math.max(desired.y, (terrainHeight(desired.x / WORLD_SCALE, desired.z / WORLD_SCALE) + .13) * WORLD_SCALE + .65);
        }
        // Pull the camera forward before it passes through a building.
        const viewDirection = desired.clone().sub(focus);
        const viewDistance = viewDirection.length();
        this.raycaster.set(focus, viewDirection.normalize());
        const obstacles = this.raycaster.intersectObjects([...this.locationGroups.values()].map(({ building }) => building), true);
        const obstruction = obstacles.find((hit) => hit.distance > .8 && hit.distance < viewDistance);
        if (obstruction) desired.copy(focus).addScaledVector(viewDirection, Math.max(1.5, obstruction.distance - .45));
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
    }
    this.sky.position.copy(this.camera.position);
    this.renderers.get(state.mode).render(this.scene, this.camera);
  }
}

let stage;
let canvasPointerStart = null;

function hasOpenDialog() {
  return elements.dialog.open || elements.help.open || elements.wardrobe.open;
}

function readWardrobeSave() {
  try { return JSON.parse(window.localStorage.getItem(wardrobeStorageKey)) || undefined; }
  catch { return undefined; }
}

function saveWardrobe() {
  try {
    window.localStorage.setItem(wardrobeStorageKey, JSON.stringify(serializeWardrobeProgress(wardrobeProgress)));
    wardrobeStorageAvailable = true;
  } catch { wardrobeStorageAvailable = false; }
}

function applyEquippedOutfit() {
  const outfit = OUTFITS.find((item) => item.id === wardrobeProgress.equipped);
  stage?.agentCharacter?.setOutfit(outfit);
  elements.worldCanvas.dataset.outfit = outfit.id;
}

function updateWardrobeStatus() {
  const xp = wardrobeXP(wardrobeProgress);
  elements.wardrobeButton.textContent = `衣橱 · Lv${xp >= 36 ? 3 : xp >= 12 ? 2 : 1}`;
}

function gainExperience(kind, locationId) {
  const previousXP = wardrobeXP(wardrobeProgress);
  const unlocked = recordWardrobeProgress(wardrobeProgress, kind, currentRegion.id, locationId);
  if (wardrobeXP(wardrobeProgress) !== previousXP) {
    saveWardrobe(); applyEquippedOutfit(); updateWardrobeStatus();
  }
  return unlocked;
}

function renderWardrobe() {
  const xp = wardrobeXP(wardrobeProgress);
  const owned = OUTFITS.filter((outfit) => isOutfitUnlocked(wardrobeProgress, outfit)).length;
  const current = OUTFITS.find((outfit) => outfit.id === wardrobeProgress.equipped);
  elements.wardrobeSummary.textContent = `${xp} 阅历 · ${owned}/10 件收藏 · 当前：${current.name}`;
  elements.wardrobeMeter.max = xp < 12 ? 12 : 36;
  elements.wardrobeMeter.value = Math.min(xp, elements.wardrobeMeter.max);
  elements.wardrobeStorageNote.textContent = wardrobeStorageAvailable
    ? "收藏与装扮保存在当前浏览器；不与其他设备同步。各洲服饰是原创旅行设计。"
    : "浏览器未允许保存：收藏仅在本次游玩中保留。";
  elements.wardrobeList.innerHTML = "";
  OUTFITS.forEach((outfit) => {
    const unlocked = isOutfitUnlocked(wardrobeProgress, outfit);
    const equipped = wardrobeProgress.equipped === outfit.id;
    const card = document.createElement("article");
    card.className = `outfit-card${unlocked ? "" : " is-locked"}${equipped ? " is-equipped" : ""}`;
    card.dataset.outfit = outfit.id;
    const hex = (color) => `#${color.toString(16).padStart(6, "0")}`;
    const region = continents.find((item) => item.id === outfit.region);
    const discovered = [...wardrobeProgress.discoveries].filter((key) => key.startsWith(`${outfit.region}:`)).length;
    const interacted = [...wardrobeProgress.encounters].filter((key) => key.startsWith(`${outfit.region}:`)).length;
    const requirement = outfit.region ? `${region.label}：地标 ${Math.min(discovered, 3)}/3 · 互动 ${Math.min(interacted, 1)}/1`
      : outfit.requiredXP ? `${Math.min(xp, outfit.requiredXP)}/${outfit.requiredXP} 阅历` : "出发即拥有";
    card.innerHTML = `<div class="outfit-sketch" data-style="${outfit.style}" style="--cloth:${hex(outfit.jacket)};--trim:${hex(outfit.trim)};--accent:${hex(outfit.accent)}" aria-hidden="true"><svg viewBox="0 0 100 110"><path class="outfit-sleeves" d="M30 18 12 29 4 62 18 68 27 46 24 98 76 98 73 46 82 68 96 62 88 29 70 18Z"/><path class="outfit-front" d="M30 18 40 12 60 12 70 18 73 96 27 96Z"/><path class="outfit-collar" d="M32 19 40 12 60 12 68 19 60 35 40 35Z"/><path class="outfit-detail" d="M39 36 39 89 M61 36 61 89 M28 91 72 91"/><circle class="outfit-badge" cx="62" cy="44" r="5"/></svg></div><div class="outfit-copy"><small>${outfit.region ? "WORLD COLLECTION" : "GROWTH EQUIPMENT"}</small><h3>${outfit.name}</h3><p>${outfit.description}</p><span class="outfit-requirement">${unlocked ? "已收藏 · " : "解锁条件 · "}${requirement}</span></div>`;
    const button = document.createElement("button");
    button.type = "button"; button.dataset.outfit = outfit.id;
    button.disabled = !unlocked;
    button.textContent = equipped ? "正在穿着" : unlocked ? "换上这件" : "尚未解锁";
    button.setAttribute("aria-label", `${outfit.name} · ${button.textContent}`);
    button.setAttribute("aria-pressed", String(equipped));
    button.addEventListener("click", () => {
      if (!equipOutfit(wardrobeProgress, outfit.id)) return;
      saveWardrobe(); applyEquippedOutfit(); updateWardrobeStatus(); renderWardrobe();
      elements.wardrobeList.querySelector(`button[data-outfit="${outfit.id}"]`)?.focus();
    });
    card.appendChild(button); elements.wardrobeList.appendChild(card);
  });
}

function openWardrobe() {
  if (state.mode !== "play" || hasOpenDialog()) return;
  finishClothingPreview();
  state.keys.clear(); state.velocity.set(0, 0, 0);
  Object.keys(state.holds).forEach((key) => { state.holds[key] = false; });
  canvasPointerStart = null;
  renderWardrobe(); elements.wardrobe.showModal();
}

function previewClothing() {
  if (state.mode !== "play" || state.outfitPreview || elements.dialog.open || elements.help.open) return;
  state.outfitPreview = { cameraMode: state.cameraMode, cameraDistance: state.cameraDistance,
    cameraPitch: state.cameraPitch, cameraYaw: stage.cameraYaw, orbitHoldUntil: state.orbitHoldUntil,
    people: [...(stage.locationGroups?.values() || [])].map(({ npc }) => [npc, npc.visible])
      .concat((stage.ambientPeople || []).map((person) => [person, person.visible])) };
  state.outfitPreview.people.forEach(([person]) => { person.visible = false; });
  elements.wardrobe.close();
  state.keys.clear(); state.velocity.set(0, 0, 0);
  Object.keys(state.holds).forEach((key) => { state.holds[key] = false; });
  state.destination = null; state.waypoints = []; state.pendingInteractId = null;
  canvasPointerStart = null; stage.moveMarker.visible = false;
  setCameraMode("third"); state.cameraDistance = 3.4; state.cameraPitch = -.05;
  stage.cameraYaw = state.facing + Math.PI; state.orbitHoldUntil = Infinity;
  elements.outfitPreviewName.textContent = OUTFITS.find((outfit) => outfit.id === wardrobeProgress.equipped).name;
  elements.outfitPreview.hidden = false;
  elements.outfitPreviewClose.focus();
}

function finishClothingPreview() {
  if (!state.outfitPreview) return;
  const previous = state.outfitPreview;
  setCameraMode(previous.cameraMode);
  state.cameraDistance = previous.cameraDistance; state.cameraPitch = previous.cameraPitch;
  stage.cameraYaw = previous.cameraYaw; state.orbitHoldUntil = previous.orbitHoldUntil;
  previous.people.forEach(([person, visible]) => { person.visible = visible; });
  state.outfitPreview = null; elements.outfitPreview.hidden = true;
  if (document.activeElement === elements.outfitPreviewClose) elements.wardrobeButton.focus();
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
  elements.intro.classList.toggle("is-active", mode === "intro");
  elements.play.classList.toggle("is-active", mode === "play");
}

function selectContinent(id) {
  const region = continents.find((item) => item.id === id);
  if (!region) return;
  selectedContinent = id;
  stage?.atlas.select(id);
  document.querySelectorAll("button[data-continent]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.continent === id)));
  $("continent-title").textContent = `${region.label} · ${region.landmarkName}`;
  $("continent-description").textContent = region.description;
  const discovered = [...wardrobeProgress.discoveries].filter((key) => key.startsWith(`${id}:`)).length;
  $("continent-progress").textContent = `${regionProgress.get(id)?.discoveries.size || discovered}/9 地标已发现`;
  if (!elements.start.disabled) elements.start.textContent = `探索${region.label} →`;
}

function saveRegionProgress() {
  regionProgress.set(currentRegion.id, {
    position: state.position.clone(), facing: state.facing, discoveries: new Set(state.discoveries),
    minutes: state.minutes, trust: state.trust, encounterCount: state.encounterCount,
    lastEncounter: new Map(state.lastEncounter)
  });
}

function returnToEarth() {
  if (state.mode !== "play") return;
  finishClothingPreview();
  saveRegionProgress();
  state.velocity.set(0, 0, 0); state.destination = null; state.waypoints = [];
  state.pendingInteractId = null; state.keys.clear();
  Object.keys(state.holds).forEach((key) => { state.holds[key] = false; });
  elements.dialog.close(); elements.help.close(); elements.wardrobe.close();
  clearTimeout(state.toastTimer); elements.toast.classList.remove("is-visible");
  setMode("intro");
  selectContinent(currentRegion.id);
  elements.start.focus();
}

function enterContinent(id) {
  const region = continents.find((item) => item.id === id);
  if (!region || !stage || elements.start.disabled) return;
  if (state.mode === "play") saveRegionProgress();
  if (currentRegion.id !== id) {
    currentRegion = region;
    locations.forEach((location, index) => {
      Object.assign(location, homeLocations[index]);
      if (id !== "asia") {
        const names = ["船代联络站", "国际机场", "出入境窗口", "海关", "港航中心", "修造船厂", "集装箱码头", "货运码头", "海上交通站"];
        location.name = `${region.label} · ${names[index]}`;
        location.person = ["港口调度", "接班旅客", "口岸工作人员", "海关关员", "港航协调员", "船厂工程师", "堆场调度", "现场理货员", "交通艇船员"][index];
      }
    });
    stage.setRegion(region);
  }
  resetGame();
  const saved = regionProgress.get(id);
  if (saved) {
    state.position.copy(saved.position); state.facing = saved.facing;
    state.discoveries = new Set(saved.discoveries); state.minutes = saved.minutes;
    state.trust = saved.trust; state.encounterCount = saved.encounterCount;
    state.lastEncounter = new Map(saved.lastEncounter); stage.cameraYaw = saved.facing;
    updateHud(); drawMinimap();
  }
  wardrobeProgress.discoveries.forEach((key) => {
    if (key.startsWith(`${id}:`)) state.discoveries.add(key.split(":")[1]);
  });
  applyEquippedOutfit(); updateHud(); drawMinimap();
  $("current-continent").textContent = region.label;
  elements.worldCanvas.dataset.continent = id;
  showToast(`${region.label} · ${region.landmarkName} · 靠近金色圆环可以返回地球`);
}

function updateHud() {
  elements.clock.textContent = formatTime(state.minutes);
  elements.trust.textContent = Math.round(state.trust);
  elements.encountered.textContent = state.encounterCount;
  elements.discovered.textContent = `${state.discoveries.size}/${locations.length}`;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

function showDiscovery(location) {
  const [name, description] = discoveryNotes[location.id];
  clearTimeout(state.discoveryTimer);
  elements.discoveryName.textContent = name;
  elements.discoveryDescription.textContent = description;
  elements.discoveryCard.hidden = false;
  state.discoveryTimer = window.setTimeout(() => { elements.discoveryCard.hidden = true; }, 4300);
}

function collectNearbyDiscoveries() {
  stage.collectibles.forEach(({ location, object, x, z }, id) => {
    if (state.discoveries.has(id)) return;
    if (Math.hypot(state.position.x - x, state.position.z - z) > 1.25) return;
    state.discoveries.add(id);
    object.visible = false;
    if (state.guideTargetId === id) state.guideTargetId = null;
    updateHud();
    showDiscovery(location);
    const unlocked = gainExperience("discovery", id);
    showToast(unlocked.length ? `解锁 ${unlocked.map((outfit) => outfit.name).join("、")} · 在衣橱查看` : `发现 ${discoveryNotes[id][0]} · 已收入船代旅行箱`);
  });
}

function callGuide() {
  if (state.mode !== "play" || hasOpenDialog()) return;
  finishClothingPreview();
  const candidates = locations
    .filter((location) => !state.discoveries.has(location.id))
    .sort((a, b) => {
      const distanceA = Math.hypot(state.position.x - a.interact[0], state.position.z - a.interact[1]);
      const distanceB = Math.hypot(state.position.x - b.interact[0], state.position.z - b.interact[1]);
      return distanceA - distanceB;
    });
  if (!candidates.length) {
    state.guideTargetId = null;
    showToast("九件港区纪念物都已经找到，接下来随心跑吧");
    return;
  }
  const target = candidates[0];
  const collectible = stage.collectibles.get(target.id);
  state.guideTargetId = target.id;
  setDestination(new THREE.Vector3(collectible.x, 0, collectible.z));
  showToast(`小飞鸟发现了线索 · 正在前往 ${target.name}`);
}

function setCameraMode(mode) {
  if (state.cameraMode !== mode) state.cameraPitch = mode === "first" ? 0 : .36;
  state.cameraMode = mode;
  state.cameraSnap = true;
  const firstPerson = mode === "first";
  elements.viewSwitch.setAttribute("aria-pressed", String(firstPerson));
  elements.viewSwitch.setAttribute("aria-label", firstPerson ? "第一人称，切换为第三人称" : "第三人称，切换为第一人称");
  elements.viewSwitch.querySelector("span").textContent = firstPerson ? "第一人称" : "第三人称";
}

function toggleCameraMode() {
  finishClothingPreview();
  setCameraMode(state.cameraMode === "third" ? "first" : "third");
  showToast(state.cameraMode === "first" ? "第一人称 · 点击前方地面继续跑" : "第三人称 · 现在可以看见自己");
}

function jump() {
  if (state.mode !== "play" || !state.grounded || hasOpenDialog()) return;
  finishClothingPreview();
  state.grounded = false;
  state.jumpVelocity = 6.15;
}

function setDestination(point, pendingInteractId = null) {
  if (!point || !insideIsland(point.x, point.z) || collides(point.x, point.z)) {
    showToast("那里走不过去，换一块地面试试");
    return;
  }
  const route = findRoute(state.position, point);
  if (!route) { showToast("那里暂时没有通路，换一处试试"); return; }
  state.waypoints = route;
  state.destination = state.waypoints.shift();
  state.pendingInteractId = pendingInteractId;
  stage.showMoveMarker(point);
}

function moveFromPointer(clientX, clientY) {
  if (state.mode !== "play" || hasOpenDialog()) return;
  finishClothingPreview();
  const portalScreen = stage.portal.localToWorld(new THREE.Vector3(0, .7, 0)).project(stage.camera);
  const portalX = (portalScreen.x + 1) * window.innerWidth / 2, portalY = (1 - portalScreen.y) * window.innerHeight / 2;
  if (portalScreen.z > -1 && portalScreen.z < 1 && Math.hypot(clientX - portalX, clientY - portalY) < 40) {
    if (Math.hypot(state.position.x + 6.5, state.position.z + 5.8) < 1) returnToEarth();
    else setDestination(new THREE.Vector3(-6.5, 0, -5.8), "world-gate");
    return;
  }
  const clickedLocation = stage.clickedLocation(clientX, clientY);
  if (clickedLocation) {
    const group = stage.locationGroups.get(clickedLocation.id);
    const npcDistance = Math.hypot(state.position.x - group.npc.position.x, state.position.z - group.npc.position.z);
    if (npcDistance < 1.35) {
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
  state.position.set(-8.1, 0, -4.2);
  state.velocity.set(0, 0, 0);
  state.facing = .85;
  state.destination = null;
  state.waypoints = [];
  state.pendingInteractId = null;
  state.jumpHeight = 0;
  state.jumpVelocity = 0;
  state.grounded = true;
  state.cameraDistance = 11.5;
  state.cameraPitch = .36;
  state.orbitHoldUntil = 0;
  stage.cameraYaw = state.facing;
  stage.moveMarker.visible = false;
  setCameraMode("third");
  state.minutes = 445;
  state.trust = 72;
  state.encounterCount = 0;
  state.discoveries.clear();
  state.guideTargetId = null;
  state.nearbyId = null;
  state.activeEncounter = null;
  state.activeChoice = false;
  state.runPhase = 0;
  state.distanceWalked = 0;
  state.nextAmbientAt = 28;
  state.lastEncounter.clear();
  clearTimeout(state.discoveryTimer);
  elements.discoveryCard.hidden = true;
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
  return colliders.some((item) => Math.hypot(x - item.x, z - item.z) < item.radius + .18);
}

function clearSegment(a, b) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .12);
  for (let i = 0; i <= steps; i += 1) {
    const t = steps ? i / steps : 0;
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    if (!insideIsland(x, z) || collides(x, z)) return false;
  }
  return true;
}

// A small navigation grid lets clicks and the guide route around port buildings.
function findRoute(start, target) {
  const end = new THREE.Vector3(target.x, 0, target.z);
  if (clearSegment(start, end)) return [end];
  const step = .55;
  const key = (x, z) => `${x},${z}`;
  const startNode = { x: Math.round(start.x / step), z: Math.round(start.z / step), g: 0, previous: null };
  const open = [startNode], known = new Map([[key(startNode.x, startNode.z), startNode]]), closed = new Set();
  while (open.length) {
    open.sort((a, b) => (a.g + Math.hypot(a.x * step - end.x, a.z * step - end.z))
      - (b.g + Math.hypot(b.x * step - end.x, b.z * step - end.z)));
    const current = open.shift();
    const currentPoint = new THREE.Vector3(current.x * step, 0, current.z * step);
    const currentKey = key(current.x, current.z);
    if (closed.has(currentKey)) continue;
    if (currentPoint.distanceTo(end) < step * 1.5 && clearSegment(currentPoint, end)) {
      const points = [end];
      for (let node = current; node.previous; node = node.previous) points.unshift(new THREE.Vector3(node.x * step, 0, node.z * step));
      const route = [], anchor = start.clone();
      let index = 0;
      while (index < points.length) {
        let farthest = index;
        while (farthest + 1 < points.length && clearSegment(anchor, points[farthest + 1])) farthest += 1;
        route.push(points[farthest]); anchor.copy(points[farthest]); index = farthest + 1;
      }
      return route;
    }
    closed.add(currentKey);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (!dx && !dz) continue;
        const x = current.x + dx, z = current.z + dz, nextKey = key(x, z);
        if (closed.has(nextKey)) continue;
        const nextPoint = new THREE.Vector3(x * step, 0, z * step);
        if (!clearSegment(current.previous ? currentPoint : start, nextPoint)) continue;
        const g = current.g + Math.hypot(dx, dz) * step;
        const previous = known.get(nextKey);
        if (previous && previous.g <= g) continue;
        const next = { x, z, g, previous: current };
        known.set(nextKey, next); open.push(next);
      }
    }
  }
  return null;
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
  state.nearbyId = nearestDistance < 1.35 ? nearest.id : null;
  if (Math.hypot(state.position.x + 6.5, state.position.z + 5.8) < 1) {
    state.nearbyId = "world-gate";
    elements.locationName.textContent = "环球传送节点 · 返回地球选择大洲";
  }
  elements.locationHint.hidden = !state.nearbyId;
  elements.mobileAction.classList.toggle("is-ready", Boolean(state.nearbyId));
  if (state.nearbyId && state.nearbyId !== "world-gate") elements.locationName.textContent = `${nearest.name} · ${nearest.person}`;
  collectNearbyDiscoveries();
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
  if (state.mode !== "play" || hasOpenDialog()) return;
  if (!state.nearbyId) {
    showToast("靠近带 ◇ 标记的人物再交互");
    return;
  }
  finishClothingPreview();
  if (state.nearbyId === "world-gate") returnToEarth();
  else openEncounter(state.nearbyId);
}

function openEncounter(locationId) {
  const location = locations.find((item) => item.id === locationId);
  const encounter = chooseEncounter(locationId);
  state.velocity.set(0, 0, 0);
  state.destination = null;
  state.waypoints = [];
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
  state.outfitUnlocks = gainExperience("encounter", state.activeEncounter.location.id);
  [...elements.sceneChoices.querySelectorAll("button")].forEach((button, buttonIndex) => {
    button.disabled = true;
    button.classList.toggle("is-chosen", buttonIndex === index);
  });
  const sign = trustDelta > 0 ? "+" : "";
  elements.resultTitle.textContent = trustDelta > 0 ? `处理稳妥 · 信任 ${sign}${trustDelta}` : trustDelta < 0 ? `现场变复杂 · 信任 ${trustDelta}` : "事情暂时过去了";
  elements.resultText.textContent = `${label}。${result}${state.outfitUnlocks.length ? ` 新装扮已解锁：${state.outfitUnlocks.map((outfit) => outfit.name).join("、")}。可在衣橱换装。` : ""}`;
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
  showToast(state.outfitUnlocks.length ? "新装扮已收入衣橱 · 继续探索，收集世界的颜色" : "现场告一段落。接下来往哪走，由你决定。");
  state.outfitUnlocks = [];
}

function update(delta) {
  if (state.mode !== "play" || hasOpenDialog() || state.outfitPreview) return;
  const axes = movementAxes();
  const desired = new THREE.Vector3(
    -Math.sin(stage.cameraYaw) * axes.z - Math.cos(stage.cameraYaw) * axes.x,
    0,
    -Math.cos(stage.cameraYaw) * axes.z + Math.sin(stage.cameraYaw) * axes.x
  );
  const hasManualInput = desired.lengthSq() > 0;
  if (hasManualInput) {
    state.destination = null;
    state.waypoints = [];
    state.pendingInteractId = null;
    stage.moveMarker.visible = false;
  } else if (state.destination) {
    desired.copy(state.destination).sub(state.position);
    desired.y = 0;
    if (desired.length() < .14) {
      state.destination = state.waypoints.shift() || null;
      stage.moveMarker.visible = Boolean(state.destination);
      desired.set(0, 0, 0);
    }
  }
  if (desired.lengthSq() > 1) desired.normalize();
  const targetVelocity = desired.multiplyScalar(1.85);
  state.velocity.lerp(targetVelocity, 1 - Math.exp(-11 * delta));
  if (state.velocity.lengthSq() > .025) {
    const distance = state.velocity.length() * delta;
    const moved = applyMovement(state.velocity.clone(), distance);
    if (moved) {
      state.runPhase += distance * WORLD_SCALE * 3.25;
      state.distanceWalked += distance;
      state.minutes += delta * .34;
      if (state.distanceWalked >= state.nextAmbientAt) {
        state.nextAmbientAt += 28 + Math.random() * 28;
        showToast(ambientMessages[Math.floor(Math.random() * ambientMessages.length)]);
      }
    } else if (state.destination) {
      state.destination = null;
      state.waypoints = [];
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

elements.start.addEventListener("click", () => enterContinent(selectedContinent));
wardrobeProgress = createWardrobeProgress(readWardrobeSave());
updateWardrobeStatus();
elements.wardrobeButton.addEventListener("click", openWardrobe);
$("wardrobe-preview").addEventListener("click", previewClothing);
$("outfit-preview-close").addEventListener("click", finishClothingPreview);
elements.wardrobeClose.addEventListener("click", () => elements.wardrobe.close());
elements.wardrobe.addEventListener("click", (event) => { if (event.target === elements.wardrobe) elements.wardrobe.close(); });
$("earth-button").addEventListener("click", returnToEarth);
continents.forEach((region) => {
  const button = document.createElement("button");
  button.type = "button"; button.dataset.continent = region.id;
  button.innerHTML = `<span>${region.label}</span><small>${region.en}</small>`;
  button.addEventListener("click", () => selectContinent(region.id));
  $("continent-selector").appendChild(button);
  const node = document.createElement("button");
  node.type = "button"; node.dataset.earthNode = region.id; node.className = "earth-node";
  node.setAttribute("aria-label", `传送到${region.label}`);
  node.textContent = region.label;
  node.addEventListener("click", () => enterContinent(region.id));
  $("earth-nodes").appendChild(node);
});
let earthPointer = null;
elements.titleCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  earthPointer = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
  elements.titleCanvas.setPointerCapture(event.pointerId);
});
elements.titleCanvas.addEventListener("pointermove", (event) => {
  if (!earthPointer) return;
  if (Math.hypot(event.clientX - earthPointer.x, event.clientY - earthPointer.y) > 7) earthPointer.moved = true;
  if (earthPointer.moved) stage.atlas.drag(event.clientX - earthPointer.lastX, event.clientY - earthPointer.lastY);
  earthPointer.lastX = event.clientX; earthPointer.lastY = event.clientY;
});
elements.titleCanvas.addEventListener("pointerup", (event) => {
  if (!earthPointer) return;
  if (!earthPointer.moved) {
    const id = stage.atlas.pick(event.clientX, event.clientY, elements.titleCanvas.getBoundingClientRect());
    if (id) enterContinent(id);
  }
  earthPointer = null;
});
elements.titleCanvas.addEventListener("pointercancel", () => { earthPointer = null; });
elements.interact.addEventListener("click", interact);
elements.mobileAction.addEventListener("click", interact);
elements.complete.addEventListener("click", closeEncounter);
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.helpButton.addEventListener("click", () => elements.help.showModal());
elements.helpClose.addEventListener("click", () => elements.help.close());
elements.viewSwitch.addEventListener("click", toggleCameraMode);
elements.jumpButton.addEventListener("click", jump);
elements.guideButton.addEventListener("click", callGuide);
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.help.addEventListener("click", (event) => { if (event.target === elements.help) elements.help.close(); });
bindHold(elements.runUp, "up");
bindHold(elements.runDown, "down");
bindHold(elements.runLeft, "left");
bindHold(elements.runRight, "right");

elements.worldCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || hasOpenDialog()) return;
  canvasPointerStart = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false, time: performance.now() };
  elements.worldCanvas.setPointerCapture(event.pointerId);
});
elements.worldCanvas.addEventListener("pointermove", (event) => {
  if (!canvasPointerStart || state.mode !== "play" || hasOpenDialog()) return;
  const distance = Math.hypot(event.clientX - canvasPointerStart.x, event.clientY - canvasPointerStart.y);
  if (distance > 7) canvasPointerStart.moved = true;
  if (canvasPointerStart.moved) {
    const dx = event.clientX - canvasPointerStart.lastX, dy = event.clientY - canvasPointerStart.lastY;
    stage.cameraYaw -= dx * .007;
    state.cameraPitch = state.cameraMode === "first"
      ? THREE.MathUtils.clamp(state.cameraPitch - dy * .005, -1.2, 1.2)
      : THREE.MathUtils.clamp(state.cameraPitch + dy * .005, -.18, 1.12);
    state.orbitHoldUntil = state.outfitPreview ? Infinity : performance.now() + 4000;
    if (state.cameraMode === "first") state.facing = stage.cameraYaw;
  }
  canvasPointerStart.lastX = event.clientX;
  canvasPointerStart.lastY = event.clientY;
});
elements.worldCanvas.addEventListener("pointerup", (event) => {
  if (!canvasPointerStart || event.button !== 0) return;
  const distance = Math.hypot(event.clientX - canvasPointerStart.x, event.clientY - canvasPointerStart.y);
  const duration = performance.now() - canvasPointerStart.time;
  const dragged = canvasPointerStart.moved;
  canvasPointerStart = null;
  if (!dragged && distance < 9 && duration < 650) moveFromPointer(event.clientX, event.clientY);
});
elements.worldCanvas.addEventListener("pointercancel", () => { canvasPointerStart = null; });
elements.worldCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
elements.worldCanvas.addEventListener("wheel", (event) => {
  if (state.cameraMode !== "third" || state.mode !== "play" || hasOpenDialog()) return;
  event.preventDefault();
  state.cameraDistance = THREE.MathUtils.clamp(state.cameraDistance + Math.sign(event.deltaY) * .8, 3.4, 55);
}, { passive: false });

const moveCodes = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
window.addEventListener("keydown", (event) => {
  if (elements.wardrobe.open) return;
  if (moveCodes.includes(event.code)) {
    event.preventDefault();
    finishClothingPreview();
    state.keys.add(event.code);
  }
  if (event.code === "Space" && !event.repeat) { event.preventDefault(); jump(); }
  if (event.code === "KeyG" && !event.repeat) { event.preventDefault(); callGuide(); }
  if (event.code === "KeyV" && !event.repeat && state.mode === "play" && !elements.dialog.open && !elements.help.open) toggleCameraMode();
  if (event.code === "KeyE" && !event.repeat && !elements.dialog.open && !elements.help.open) interact();
  if (event.key === "?" && !elements.help.open) elements.help.showModal();
  if (event.code === "Escape") {
    finishClothingPreview();
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
  loadAgentCharacter().then((character) => {
    stage.agentCharacter = character;
    stage.player.add(character.object);
    stage.player.userData.rig.visible = false;
    elements.worldCanvas.dataset.character = "skinned";
    applyEquippedOutfit();
  }).catch((error) => {
    console.warn("角色模型加载失败，使用内置角色", error);
  });
  setCameraMode("third");
  setMode("intro");
  selectContinent("asia");
  stage.atlas.textureReady.then(() => {
    elements.start.disabled = false;
    selectContinent(selectedContinent);
  }).catch((error) => {
    console.error("地球地图加载失败", error);
    elements.start.textContent = "地图加载失败";
    elements.intro.querySelector(".intro-tip").textContent = "请刷新页面重新加载地球地图。";
  });
  updateHud();
  drawMinimap();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  elements.start.textContent = "WEBGL 不可用";
  elements.start.disabled = true;
  elements.intro.querySelector(".intro-tip").textContent = "当前浏览器无法启动 3D 场景，请更新浏览器或开启硬件加速。";
}

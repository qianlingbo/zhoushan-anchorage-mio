(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const palette = {
    ink: "#172c32",
    paper: "#f4edda",
    cream: "#fffaf0",
    sea: "#87ccc9",
    seaDeep: "#5fa9a5",
    blue: "#5f8ca0",
    orange: "#ed6a45",
    yellow: "#f0bd4d",
    green: "#6c9b74",
    greenDark: "#4c755c",
    land: "#d8c98e",
    road: "#c47755"
  };

  const locations = [
    { id: "office", name: "船代办公室", short: "办公室", angle: 0, kind: "office", color: palette.yellow },
    { id: "airport", name: "普陀山机场", short: "机场", angle: 0.7, kind: "airport", color: "#e99a58" },
    { id: "immigration", name: "出入境边防检查站", short: "边检", angle: 1.4, kind: "immigration", color: "#d96d55" },
    { id: "customs", name: "舟山海关", short: "海关", angle: 2.1, kind: "customs", color: "#7397a4" },
    { id: "shipyard", name: "船厂修造码头", short: "船厂", angle: 2.8, kind: "shipyard", color: "#ce8550" },
    { id: "msa", name: "海事政务窗口", short: "海事", angle: 3.5, kind: "msa", color: "#5e8ba1" },
    { id: "container", name: "集装箱码头", short: "集装箱", angle: 4.2, kind: "container", color: "#e2a84f" },
    { id: "cargo", name: "件杂货码头", short: "装卸码头", angle: 4.9, kind: "cargo", color: "#ba7452" },
    { id: "anchorage", name: "锚地交通艇码头", short: "锚地", angle: 5.6, kind: "anchorage", color: "#568d91" }
  ];

  const tasks = [
    {
      destination: "airport", deadline: "08:10 前", title: "机场接班船员",
      description: "沿星球跑到机场，确认接班船员身份和登轮安排。",
      code: "AIRPORT / 01", sceneLocation: "普陀山机场 · 到达大厅",
      sceneTitle: "四名接班船员已经到了",
      story: "船员带着行李在出口等候，其中一人的航班信息与预报有一点出入。车辆已经在外面催促。",
      question: "离开机场前，最稳妥的第一步是？",
      choices: ["逐一核对身份、行程、登轮名单和行李", "先上车，路上再慢慢确认", "只确认人数，证件到码头再看"],
      correct: 0, success: "核对完成。人员、证件、行李与登轮安排一致，可以安全出发。",
      duration: 25, energy: 4, color: "#e99a58"
    },
    {
      destination: "immigration", deadline: "09:10 前", title: "边检入境手续",
      description: "把最新船期和人员信息带到边检窗口。",
      code: "IMMIGRATION / 02", sceneLocation: "出入境边防检查站 · 船舶窗口",
      sceneTitle: "实际靠泊时间又变了",
      story: "代理计划上的时间和刚收到的实际动态不一致，窗口正在等你确认。",
      question: "你应该怎样处理这处变化？",
      choices: ["沿用旧计划，避免多解释", "更新为实际计划并说明变化原因", "先提交，之后有空再补"],
      correct: 1, success: "变化已经说明，申报信息与实际动态一致。",
      duration: 35, energy: 5, color: "#d96d55"
    },
    {
      destination: "customs", deadline: "10:05 前", title: "海关物料申报",
      description: "船供物料临时增加，去海关确认申报信息。",
      code: "CUSTOMS / 03", sceneLocation: "舟山海关 · 业务窗口",
      sceneTitle: "供应清单临时多了两项",
      story: "供应商已经在路上，但新增物料尚未反映在原申报清单里。",
      question: "下一步最合适的是？",
      choices: ["先送上船，数量不大", "删掉新增项，按原单操作", "进港前更新申报并确认放行要求"],
      correct: 2, success: "清单已更新，供应安排与申报内容一致。",
      duration: 30, energy: 5, color: "#7397a4"
    },
    {
      destination: "shipyard", deadline: "11:20 前", title: "船厂登轮协调",
      description: "工程师要进厂登轮，先把通行和安全路线落实。",
      code: "SHIPYARD / 04", sceneLocation: "船厂 · 门岗外",
      sceneTitle: "工程师到了，门岗却没有记录",
      story: "现场正进行吊装作业，原定登轮路线也被临时封闭。",
      question: "怎样安排最稳妥？",
      choices: ["让工程师自己找船", "确认入厂权限、安全要求和替代路线", "借用别人的证件先进去"],
      correct: 1, success: "厂方确认了通行权限，并给出安全登轮路线。",
      duration: 40, energy: 7, color: "#ce8550"
    },
    {
      destination: "msa", deadline: "13:30 前", title: "海事文件确认",
      description: "去海事窗口确认本航次所需文件和回执。",
      code: "MSA / 05", sceneLocation: "海事政务窗口 · 受理台",
      sceneTitle: "系统里出现了两个版本",
      story: "船方刚补发了一份文件，文件名相似，但签章时间不同。",
      question: "提交前首先确认什么？",
      choices: ["确认本航次要求、有效版本并留存回执", "随便选一份较大的文件", "两个版本一起传，不作说明"],
      correct: 0, success: "有效版本已经确认，受理回执也已留存。",
      duration: 30, energy: 4, color: "#5e8ba1"
    },
    {
      destination: "container", deadline: "14:40 前", title: "集装箱码头进场",
      description: "核对预约、车辆与最新作业计划，带人进场。",
      code: "CONTAINER / 06", sceneLocation: "集装箱码头 · 一号卡口",
      sceneTitle: "车辆信息和预约单差一位",
      story: "卡口排起了队，司机希望先进去再修改。",
      question: "此时应该怎么做？",
      choices: ["让司机跟前车混进去", "核对预约、人员、车辆和最新计划后更正", "取消今天的全部安排"],
      correct: 1, success: "信息已更正，车辆按预约顺利进场。",
      duration: 35, energy: 6, color: "#e2a84f"
    },
    {
      destination: "cargo", deadline: "16:05 前", title: "装卸完工确认",
      description: "去件杂货码头核实完工、单证与离泊条件。",
      code: "CARGO / 07", sceneLocation: "件杂货码头 · 作业平台",
      sceneTitle: "最后一票货正在收尾",
      story: "船长询问能否按原时间开航，但现场尚未给出最终完工确认。",
      question: "向船长回复前需要什么？",
      choices: ["凭经验直接保证准时", "只问吊机司机是否结束", "确认完工、货物放行和离泊手续状态"],
      correct: 2, success: "现场、单证和离泊条件均已核实，开航时间可以确认。",
      duration: 35, energy: 7, color: "#ba7452"
    },
    {
      destination: "anchorage", deadline: "17:20 前", title: "锚地交通艇登轮",
      description: "最后一程去锚地，确认天气、船艇与会合位置。",
      code: "ANCHORAGE / 08", sceneLocation: "锚地交通艇码头 · 浮桥",
      sceneTitle: "风浪正在慢慢变大",
      story: "交通艇准备离岸，船方刚刚调整了锚位。",
      question: "解缆前最后确认什么？",
      choices: ["只要交通艇能开就出发", "确认天气、适航、救生装备和新会合点", "站在甲板上用手机找船"],
      correct: 1, success: "天气与船艇条件允许，新锚位和会合方式已经确认。",
      duration: 45, energy: 8, color: "#568d91"
    }
  ];

  const surfaceFeatures = [
    [0.18, 0.12, "tree"], [0.36, -0.08, "bush"], [0.94, 0.02, "tree"],
    [1.12, -0.16, "wave"], [1.72, 0.12, "tree"], [1.93, -0.05, "bush"],
    [2.46, 0.05, "crane"], [2.63, -0.14, "wave"], [3.06, 0.16, "tree"],
    [3.76, -0.06, "bush"], [3.92, 0.12, "tree"], [4.48, -0.12, "container"],
    [4.66, 0.13, "tree"], [5.16, -0.07, "crane"], [5.35, 0.12, "bush"],
    [5.92, -0.12, "wave"], [6.08, 0.1, "tree"]
  ];

  const $ = (id) => document.getElementById(id);
  const elements = {
    intro: $("intro-screen"), play: $("play-screen"), ending: $("ending-screen"),
    titleCanvas: $("title-canvas"), worldCanvas: $("world-canvas"), endingCanvas: $("ending-canvas"),
    start: $("start-button"), restart: $("restart-button"), clock: $("clock-value"),
    energy: $("energy-value"), completed: $("completed-value"), sequence: $("task-sequence"),
    deadline: $("task-deadline"), taskTitle: $("task-title"), description: $("task-description"),
    destination: $("task-destination"), orbit: $("orbit-progress"), locationHint: $("location-hint"),
    locationName: $("location-name"), interact: $("interact-button"), mobileAction: $("mobile-action"),
    runLeft: $("run-left"), runRight: $("run-right"), toast: $("toast"),
    dialog: $("scene-dialog"), sceneVisual: $("scene-visual"), sceneCode: $("scene-code"),
    sceneLocation: $("scene-location"), sceneTitle: $("scene-title"), sceneStory: $("scene-story"),
    sceneQuestion: $("scene-question"), sceneChoices: $("scene-choices"), sceneResult: $("scene-result"),
    resultTitle: $("result-title"), resultText: $("result-text"), complete: $("complete-button"),
    dialogClose: $("dialog-close"), help: $("help-dialog"), helpButton: $("help-button"),
    helpClose: $("help-close"), finalScore: $("final-score"), finalTime: $("final-time"),
    endingSummary: $("ending-summary")
  };

  const state = {
    mode: "intro", rotation: 0, velocity: 0, direction: 1,
    keys: new Set(), holds: { left: false, right: false },
    taskIndex: 0, completed: 0, minutes: 7 * 60 + 20, energy: 100,
    score: 100, nearTarget: false, lastFrame: performance.now(),
    sceneAnswered: false, toastTimer: 0, runPhase: 0
  };

  const canvases = [elements.titleCanvas, elements.worldCanvas, elements.endingCanvas];

  function wrapAngle(value) {
    return ((value % TAU) + TAU) % TAU;
  }

  function signedAngle(value) {
    let result = wrapAngle(value);
    if (result > Math.PI) result -= TAU;
    return result;
  }

  function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function resizeCanvases() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvases.forEach((canvas) => {
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.dataset.ratio = ratio;
    });
  }

  function canvasContext(canvas) {
    const ctx = canvas.getContext("2d");
    const ratio = Number(canvas.dataset.ratio) || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
  }

  function project(angle, latitude, cx, cy, radius, rotation) {
    const relative = signedAngle(angle - rotation);
    const cosLatitude = Math.cos(latitude);
    const z = Math.cos(relative) * cosLatitude;
    return {
      x: cx + Math.sin(relative) * cosLatitude * radius,
      y: cy + Math.sin(latitude) * radius * 0.82 + z * radius * 0.3,
      z,
      scale: 0.35 + (z + 1) * 0.34
    };
  }

  function planetGeometry(width, height, compact = false) {
    const radius = Math.min(width * (compact ? 0.28 : 0.31), height * (compact ? 0.34 : 0.43), compact ? 275 : 390);
    return { cx: width * 0.52, cy: height * (compact ? 0.5 : 0.5), radius };
  }

  function drawSky(ctx, width, height, time, ending = false) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, ending ? "#e39c76" : "#91d5d0");
    gradient.addColorStop(0.68, ending ? "#edbd83" : "#7bc3bf");
    gradient.addColorStop(1, ending ? "#d77b61" : "#69aaa9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = ending ? "rgba(255,250,240,.42)" : "rgba(255,250,240,.48)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i += 1) {
      const x = ((i * 211 + time * (4 + i * 0.3)) % (width + 160)) - 80;
      const y = 95 + (i % 3) * 66;
      ctx.beginPath();
      ctx.arc(x, y, 18 + (i % 2) * 8, Math.PI * 1.08, Math.PI * 1.86);
      ctx.stroke();
    }
    ctx.restore();

    if (ending) {
      ctx.fillStyle = "rgba(255,246,203,.75)";
      ctx.beginPath();
      ctx.arc(width * 0.79, height * 0.22, Math.min(width, height) * 0.085, 0, TAU);
      ctx.fill();
    }
  }

  function drawPlanetBase(ctx, geo, rotation) {
    const { cx, cy, radius } = geo;
    ctx.save();
    ctx.shadowColor = "rgba(23,44,50,.28)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 22;
    const gradient = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.38, radius * 0.1, cx, cy, radius);
    gradient.addColorStop(0, "#b5dfd1");
    gradient.addColorStop(0.52, palette.sea);
    gradient.addColorStop(1, "#4f9695");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, TAU);
    ctx.clip();

    const landShift = Math.sin(rotation) * radius * 0.2;
    ctx.fillStyle = palette.land;
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.55 + landShift, cy + radius * 0.05, radius * 0.58, radius * 0.82, -0.35, 0, TAU);
    ctx.ellipse(cx + radius * 0.55 + landShift, cy + radius * 0.16, radius * 0.54, radius * 0.7, 0.45, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(255,250,240,.13)";
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.arc(cx + Math.sin(i * 2.3 + rotation) * radius * 0.74, cy + Math.cos(i * 1.7) * radius * 0.5, 7 + (i % 3) * 4, 0, TAU);
      ctx.fill();
    }

    drawRoad(ctx, geo, rotation);
    ctx.restore();

    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
  }

  function drawRoad(ctx, geo, rotation) {
    const points = [];
    for (let i = 0; i <= 96; i += 1) {
      const angle = (i / 96) * TAU;
      points.push(project(angle, 0.34, geo.cx, geo.cy, geo.radius, rotation));
    }
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = Math.max(5, geo.radius * 0.025);
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    let drawing = false;
    points.forEach((point) => {
      if (point.z > 0) {
        if (!drawing) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
        drawing = true;
      } else drawing = false;
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawTinyFeature(ctx, item, geo, rotation) {
    const [angle, latitude, kind] = item;
    const p = project(angle, latitude + 0.22, geo.cx, geo.cy, geo.radius, rotation);
    if (p.z < 0.05) return;
    const s = p.scale * Math.max(0.7, geo.radius / 290);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(s, s);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (kind === "tree" || kind === "bush") {
      ctx.fillStyle = kind === "tree" ? palette.green : "#88aa72";
      ctx.beginPath();
      ctx.arc(0, -12, kind === "tree" ? 9 : 7, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 6); ctx.stroke();
    } else if (kind === "wave") {
      ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(15, 2, 8, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
    } else if (kind === "container") {
      ctx.fillStyle = palette.orange; ctx.fillRect(-10, -9, 20, 15); ctx.strokeRect(-10, -9, 20, 15);
      ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-3, 6); ctx.moveTo(4, -9); ctx.lineTo(4, 6); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(-9, -16); ctx.lineTo(7, -16); ctx.lineTo(13, -3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(10, 6); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuilding(ctx, location, geo, rotation, isTarget, time) {
    const p = project(location.angle, 0.34, geo.cx, geo.cy, geo.radius, rotation);
    if (p.z < -0.05) return;
    const s = p.scale * Math.max(0.72, geo.radius / 310);
    const alpha = Math.min(1, (p.z + 0.05) * 3.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.scale(s, s);
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = location.color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";

    if (location.kind === "airport") {
      ctx.fillRect(-22, -31, 44, 31); ctx.strokeRect(-22, -31, 44, 31);
      ctx.fillStyle = palette.cream; ctx.fillRect(-15, -23, 9, 9); ctx.fillRect(4, -23, 9, 9);
      ctx.beginPath(); ctx.moveTo(-39, -20); ctx.lineTo(37, -20); ctx.lineTo(45, -14); ctx.lineTo(-45, -14); ctx.closePath();
      ctx.fillStyle = palette.cream; ctx.fill(); ctx.stroke();
    } else if (location.kind === "shipyard") {
      ctx.fillStyle = location.color; ctx.fillRect(-25, -23, 50, 23); ctx.strokeRect(-25, -23, 50, 23);
      ctx.beginPath(); ctx.moveTo(-30, -24); ctx.lineTo(-30, -54); ctx.lineTo(10, -54); ctx.lineTo(22, -30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-29, -47); ctx.lineTo(18, -4); ctx.stroke();
    } else if (location.kind === "container" || location.kind === "cargo") {
      const colors = [palette.orange, palette.yellow, palette.blue];
      for (let row = 0; row < 2; row += 1) for (let col = 0; col < 3; col += 1) {
        ctx.fillStyle = colors[(row + col) % colors.length];
        ctx.fillRect(-30 + col * 20, -13 - row * 15, 18, 14); ctx.strokeRect(-30 + col * 20, -13 - row * 15, 18, 14);
      }
      ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(36, 0); ctx.stroke();
    } else if (location.kind === "anchorage") {
      ctx.fillStyle = palette.cream;
      ctx.beginPath(); ctx.moveTo(-31, -9); ctx.lineTo(31, -9); ctx.lineTo(21, 5); ctx.lineTo(-22, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = location.color; ctx.fillRect(-10, -21, 22, 12); ctx.strokeRect(-10, -21, 22, 12);
      ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(0, -36); ctx.lineTo(15, -28); ctx.stroke();
    } else {
      ctx.fillRect(-24, -34, 48, 34); ctx.strokeRect(-24, -34, 48, 34);
      ctx.fillStyle = palette.cream;
      ctx.fillRect(-15, -25, 9, 11); ctx.strokeRect(-15, -25, 9, 11);
      ctx.fillRect(6, -25, 9, 11); ctx.strokeRect(6, -25, 9, 11);
      ctx.fillStyle = palette.ink; ctx.fillRect(-4, -16, 9, 16);
      if (location.kind === "immigration" || location.kind === "msa") {
        ctx.beginPath(); ctx.moveTo(-29, -35); ctx.lineTo(0, -50); ctx.lineTo(29, -35); ctx.closePath();
        ctx.fillStyle = palette.cream; ctx.fill(); ctx.stroke();
      }
    }

    roundedRect(ctx, -34, 8, 68, 19, 4);
    ctx.fillStyle = "rgba(255,250,240,.94)"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.font = "800 11px 'Kaiti SC', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(location.short, 0, 18);

    if (isTarget) {
      const pulse = 1 + Math.sin(time * 5) * 0.08;
      ctx.save(); ctx.scale(pulse, pulse);
      ctx.fillStyle = palette.orange;
      ctx.beginPath(); ctx.moveTo(0, -69); ctx.lineTo(9, -54); ctx.lineTo(0, -42); ctx.lineTo(-9, -54); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRunner(ctx, geo, stateRef, time) {
    const moving = Math.abs(stateRef.velocity) > 0.03;
    const stride = moving ? Math.sin(stateRef.runPhase) : Math.sin(time * 2) * 0.08;
    const x = geo.cx;
    const y = geo.cy + geo.radius * 0.69;
    const scale = Math.max(0.86, geo.radius / 315);
    const facing = stateRef.direction || 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * facing, scale);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.scale(1 / facing, 1);
    ctx.fillStyle = palette.ink;
    ctx.beginPath(); ctx.ellipse(0, 5, 27, 7, 0, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.beginPath(); ctx.moveTo(-5, -37); ctx.lineTo(-13 - stride * 8, -18); ctx.lineTo(-24 + stride * 7, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -35); ctx.lineTo(16 + stride * 8, -17); ctx.stroke();

    ctx.fillStyle = palette.orange;
    ctx.beginPath(); ctx.moveTo(-12, -55); ctx.quadraticCurveTo(0, -62, 13, -53); ctx.lineTo(10, -22); ctx.lineTo(-9, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.cream; ctx.fillRect(2, -48, 11, 14); ctx.strokeRect(2, -48, 11, 14);

    ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(-14 + stride * 12, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -23); ctx.lineTo(14 - stride * 12, 1); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-14 + stride * 12, 1); ctx.lineTo(-23 + stride * 12, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14 - stride * 12, 1); ctx.lineTo(23 - stride * 12, 1); ctx.stroke();

    ctx.lineWidth = 3;
    ctx.fillStyle = "#d9a16e";
    ctx.beginPath(); ctx.arc(0, -70, 12, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.beginPath(); ctx.arc(-2, -75, 12, Math.PI, TAU); ctx.lineTo(10, -70); ctx.quadraticCurveTo(-1, -80, -12, -72); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -70); ctx.lineTo(9, -68); ctx.stroke();

    ctx.fillStyle = palette.cream;
    ctx.fillRect(-20, -52, 11, 24); ctx.strokeRect(-20, -52, 11, 24);
    ctx.restore();
  }

  function drawPlanetScene(canvas, time, rotation, options = {}) {
    const ctx = canvasContext(canvas);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const compact = Boolean(options.intro);
    const geo = planetGeometry(width, height, compact);
    if (options.intro) {
      geo.cx = width * 0.5;
      geo.cy = height * 0.48;
      geo.radius = Math.min(width * 0.24, height * 0.31, 245);
    }

    ctx.clearRect(0, 0, width, height);
    drawSky(ctx, width, height, time, options.ending);

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(geo.cx, geo.cy, geo.radius * 1.35, geo.radius * 0.38, -0.2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(geo.cx, geo.cy, geo.radius * 1.18, geo.radius * 0.26, 0.3, 0, TAU); ctx.stroke();
    ctx.restore();

    drawPlanetBase(ctx, geo, rotation);
    surfaceFeatures.forEach((feature) => drawTinyFeature(ctx, feature, geo, rotation));

    const targetId = state.mode === "play" && state.taskIndex < tasks.length ? tasks[state.taskIndex].destination : "";
    const visibleLocations = locations
      .map((location) => ({ location, depth: project(location.angle, 0.34, geo.cx, geo.cy, geo.radius, rotation).z }))
      .sort((a, b) => a.depth - b.depth);
    visibleLocations.forEach(({ location }) => drawBuilding(ctx, location, geo, rotation, location.id === targetId, time));

    if (!options.intro && !options.ending) drawRunner(ctx, geo, state, time);

    if (options.intro) {
      ctx.save();
      ctx.translate(geo.cx, geo.cy + geo.radius * 0.74);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 19, Math.PI, TAU); ctx.stroke();
      ctx.fillStyle = palette.orange;
      ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(10, -17); ctx.lineTo(14, 7); ctx.lineTo(-13, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    return geo;
  }

  function setMode(mode) {
    state.mode = mode;
    [elements.intro, elements.play, elements.ending].forEach((screen) => screen.classList.remove("is-active"));
    elements[mode].classList.add("is-active");
  }

  function updateHud() {
    const task = tasks[state.taskIndex];
    elements.clock.textContent = formatTime(state.minutes);
    elements.energy.textContent = Math.max(0, Math.round(state.energy));
    elements.completed.textContent = state.completed;
    if (!task) return;
    const location = locations.find((item) => item.id === task.destination);
    elements.sequence.textContent = `${String(state.taskIndex + 1).padStart(2, "0")} / ${String(tasks.length).padStart(2, "0")}`;
    elements.deadline.textContent = task.deadline;
    elements.taskTitle.textContent = task.title;
    elements.description.textContent = task.description;
    elements.destination.textContent = `下一站 · ${location.name}`;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
  }

  function resetGame() {
    state.rotation = 0;
    state.velocity = 0;
    state.direction = 1;
    state.taskIndex = 0;
    state.completed = 0;
    state.minutes = 7 * 60 + 20;
    state.energy = 100;
    state.score = 100;
    state.nearTarget = false;
    state.sceneAnswered = false;
    state.keys.clear();
    state.holds.left = false;
    state.holds.right = false;
    updateHud();
    setMode("play");
    showToast("沿着星球跑，橙色信标就是下一站");
  }

  function updateNearTarget() {
    const task = tasks[state.taskIndex];
    if (!task) return;
    const location = locations.find((item) => item.id === task.destination);
    const distance = Math.abs(signedAngle(location.angle - state.rotation));
    state.nearTarget = distance < 0.24;
    elements.locationHint.hidden = !state.nearTarget;
    elements.mobileAction.classList.toggle("is-ready", state.nearTarget);
    elements.locationName.textContent = location.name;
  }

  function openScene() {
    if (state.mode !== "play" || elements.dialog.open) return;
    if (!state.nearTarget) {
      showToast("让橙色信标跑到人物脚下再办理");
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
    elements.sceneQuestion.textContent = task.question;
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
    const smoothing = 1 - Math.pow(0.001, delta);
    state.velocity += (targetVelocity - state.velocity) * smoothing;
    if (input) state.direction = input;
    state.rotation = wrapAngle(state.rotation + state.velocity * delta);
    state.runPhase += Math.abs(state.velocity) * delta * 13;
    if (Math.abs(state.velocity) > 0.03) {
      state.minutes += delta * 0.5;
      state.energy = Math.max(12, state.energy - delta * 0.08);
    }
    const normalized = wrapAngle(state.rotation) / TAU;
    elements.orbit.style.top = `${8 + normalized * 84}%`;
    updateNearTarget();
    updateHud();
  }

  function frame(now) {
    const delta = Math.min((now - state.lastFrame) / 1000, 0.05);
    state.lastFrame = now;
    const seconds = now / 1000;

    if (state.mode === "intro") drawPlanetScene(elements.titleCanvas, seconds, seconds * 0.12, { intro: true });
    if (state.mode === "play") {
      update(delta);
      drawPlanetScene(elements.worldCanvas, seconds, state.rotation);
    }
    if (state.mode === "ending") drawPlanetScene(elements.endingCanvas, seconds, state.rotation + seconds * 0.035, { ending: true });
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

  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
  elements.help.addEventListener("click", (event) => {
    if (event.target === elements.help) elements.help.close();
  });

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
  window.addEventListener("resize", resizeCanvases);

  resizeCanvases();
  updateHud();
  requestAnimationFrame(frame);
})();

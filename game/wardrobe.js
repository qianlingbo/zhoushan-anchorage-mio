const regions = ["asia", "europe", "africa", "north-america", "south-america", "oceania", "antarctica"];
const locations = ["office", "airport", "immigration", "customs", "msa", "shipyard", "container", "cargo", "anchorage"];

export const OUTFITS = [
  { id: "basic", name: "初行 · 海蓝外套", description: "轻便连帽衫，陪少年踏上第一段旅程。", region: null, requiredXP: 0, style: "hoodie", jacket: 0x487b91, trousers: 0x394854, shoes: 0xd0dce0, trim: 0xc8dcdf, accent: 0xd69d4f },
  { id: "voyager", name: "远行 · 风之旅装", description: "苔绿外套、暖色围巾与航海徽章。", region: null, requiredXP: 12, style: "traveler", jacket: 0x52765e, trousers: 0x38483e, shoes: 0xbea77d, trim: 0xd5b686, accent: 0xa56b43 },
  { id: "master", name: "星航 · 金绣礼装", description: "夜蓝外套、金色滚边与双肩披饰。", region: null, requiredXP: 36, style: "ceremonial", jacket: 0x27384f, trousers: 0x293344, shoes: 0xc1a66c, trim: 0xe8c369, accent: 0xa9cee1 },
  { id: "asia", name: "亚洲 · 海潮绣纹", description: "青蓝短披与浪纹胸饰，来自家乡海港的灵感。", region: "asia", requiredXP: 0, style: "regional", jacket: 0x3d7b83, trousers: 0x304755, shoes: 0xd8ccb4, trim: 0xddc394, accent: 0x69bdb4 },
  { id: "europe", name: "欧洲 · 白帆航海", description: "象牙白肩披、酒红围巾与黄铜扣。", region: "europe", requiredXP: 0, style: "regional", jacket: 0xbeb5a0, trousers: 0x3d4657, shoes: 0x786657, trim: 0xd5b67a, accent: 0x994a48 },
  { id: "africa", name: "非洲 · 海岸织纹", description: "赭金外套与彩色织纹，灵感取自东非海岸。", region: "africa", requiredXP: 0, style: "regional", jacket: 0xa56b3d, trousers: 0x4a3d31, shoes: 0xd7b78b, trim: 0xe2c077, accent: 0x66a18d },
  { id: "north-america", name: "北美洲 · 灯塔巡航", description: "砖红旅装、肩章与深蓝斜挎饰带。", region: "north-america", requiredXP: 0, style: "regional", jacket: 0x9b584d, trousers: 0x374654, shoes: 0xc3a981, trim: 0xd9b585, accent: 0x365873 },
  { id: "south-america", name: "南美洲 · 热带彩羽", description: "翠绿外套配彩羽胸饰与明亮腰带。", region: "south-america", requiredXP: 0, style: "regional", jacket: 0x387966, trousers: 0x3b5045, shoes: 0xd7c19d, trim: 0xdab761, accent: 0xc36960 },
  { id: "oceania", name: "大洋洲 · 砂岩风衣", description: "沙色衣襟、海蓝围巾与编结小饰。", region: "oceania", requiredXP: 0, style: "regional", jacket: 0xb99468, trousers: 0x46564d, shoes: 0xd8cbb0, trim: 0xf0dfb5, accent: 0x4f8e9e },
  { id: "antarctica", name: "南极洲 · 极光科考", description: "冰蓝保暖肩披、厚领与橙色科考标识。", region: "antarctica", requiredXP: 0, style: "regional", jacket: 0x80aebf, trousers: 0x354b60, shoes: 0xdfe6e6, trim: 0xe8f0ea, accent: 0xd77d48 }
];

function validRecord(key) {
  if (typeof key !== "string") return false;
  const [region, location, extra] = key.split(":");
  return !extra && key.split(":").length === 2 && regions.includes(region) && locations.includes(location);
}

export function wardrobeXP(progress) {
  return progress.discoveries.size * 2 + progress.encounters.size * 3;
}

export function isOutfitUnlocked(progress, outfitOrId) {
  const outfit = OUTFITS.find((item) => item.id === (typeof outfitOrId === "string" ? outfitOrId : outfitOrId?.id));
  if (!outfit) return false;
  if (!outfit.region) return wardrobeXP(progress) >= outfit.requiredXP;
  return [...progress.discoveries].filter((key) => key.startsWith(`${outfit.region}:`)).length >= 3
    && [...progress.encounters].some((key) => key.startsWith(`${outfit.region}:`));
}

export function createWardrobeProgress(saved) {
  const progress = { discoveries: new Set(), encounters: new Set(), equipped: "basic" };
  if (!saved || saved.version !== 1) return progress;
  for (const kind of ["discoveries", "encounters"]) {
    if (Array.isArray(saved[kind])) progress[kind] = new Set(saved[kind].filter(validRecord));
  }
  progress.equipped = isOutfitUnlocked(progress, saved.equipped) ? saved.equipped
    : wardrobeXP(progress) >= 36 ? "master" : wardrobeXP(progress) >= 12 ? "voyager" : "basic";
  return progress;
}

export function equipOutfit(progress, id) {
  if (!isOutfitUnlocked(progress, id)) return false;
  progress.equipped = id;
  return true;
}

export function recordWardrobeProgress(progress, kind, region, location) {
  if (!["discovery", "encounter"].includes(kind) || !validRecord(`${region}:${location}`)) return [];
  const collection = kind === "discovery" ? progress.discoveries : progress.encounters;
  const key = `${region}:${location}`;
  if (collection.has(key)) return [];
  const previous = new Set(OUTFITS.filter((outfit) => isOutfitUnlocked(progress, outfit)).map((outfit) => outfit.id));
  collection.add(key);
  const unlocked = OUTFITS.filter((outfit) => !previous.has(outfit.id) && isOutfitUnlocked(progress, outfit));
  const upgrade = unlocked.filter((outfit) => !outfit.region).at(-1);
  if (upgrade && ["basic", "voyager", "master"].includes(progress.equipped)) progress.equipped = upgrade.id;
  return unlocked;
}

export function serializeWardrobeProgress(progress) {
  return { version: 1, discoveries: [...progress.discoveries], encounters: [...progress.encounters], equipped: progress.equipped };
}

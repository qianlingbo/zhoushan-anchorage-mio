const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const filename = path.resolve(__dirname, "../wardrobe.js");
const regions = ["asia", "europe", "africa", "north-america", "south-america", "oceania", "antarctica"];
const locations = ["office", "airport", "immigration", "customs", "msa", "shipyard", "container", "cargo", "anchorage"];

async function wardrobe() {
  assert.ok(fs.existsSync(filename), "Growth wardrobe progression has not been implemented");
  return import(pathToFileURL(filename).href);
}

function discover(api, progress, region, placeIds) {
  return placeIds.flatMap((id) => api.recordWardrobeProgress(progress, "discovery", region, id));
}

function unlockRegion(api, progress, region) {
  discover(api, progress, region, ["office", "airport", "immigration"]);
  return api.recordWardrobeProgress(progress, "encounter", region, "customs");
}

test("the wardrobe exposes three growth tiers and seven original regional outfits", async () => {
  const { OUTFITS } = await wardrobe();
  assert.deepEqual(OUTFITS.map((outfit) => outfit.id).sort(), ["basic", "voyager", "master", ...regions].sort());
  for (const outfit of OUTFITS) {
    assert.equal(typeof outfit.name, "string");
    assert.ok(outfit.name.length > 0 && outfit.description.length > 0);
    assert.ok([null, ...regions].includes(outfit.region));
    assert.ok(["hoodie", "traveler", "ceremonial", "regional"].includes(outfit.style));
    for (const field of ["jacket", "trousers", "shoes", "trim", "accent"]) {
      assert.ok(Number.isInteger(outfit[field]) && outfit[field] >= 0 && outfit[field] <= 0xffffff, `${outfit.id}.${field} must be a 24-bit color`);
    }
  }
  assert.equal(OUTFITS.find((outfit) => outfit.id === "basic").requiredXP, 0);
  assert.equal(OUTFITS.find((outfit) => outfit.id === "voyager").requiredXP, 12);
  assert.equal(OUTFITS.find((outfit) => outfit.id === "master").requiredXP, 36);
});

test("a new player owns only the basic hoodie with zero XP", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  assert.ok(progress.discoveries instanceof Set && progress.encounters instanceof Set);
  assert.equal(progress.equipped, "basic");
  assert.equal(api.wardrobeXP(progress), 0);
  assert.deepEqual(api.OUTFITS.filter((outfit) => api.isOutfitUnlocked(progress, outfit)).map((outfit) => outfit.id), ["basic"]);
});

test("discoveries award two XP and encounters three XP, once per region and location", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  assert.deepEqual(api.recordWardrobeProgress(progress, "discovery", "asia", "office"), []);
  assert.equal(api.wardrobeXP(progress), 2);
  assert.deepEqual(api.recordWardrobeProgress(progress, "discovery", "asia", "office"), []);
  assert.equal(api.wardrobeXP(progress), 2);
  api.recordWardrobeProgress(progress, "encounter", "asia", "office");
  assert.equal(api.wardrobeXP(progress), 5);
  api.recordWardrobeProgress(progress, "encounter", "asia", "office");
  assert.equal(api.wardrobeXP(progress), 5);
  api.recordWardrobeProgress(progress, "discovery", "europe", "office");
  assert.equal(api.wardrobeXP(progress), 7);
  assert.deepEqual([...progress.discoveries], ["asia:office", "europe:office"]);
});

test("unknown actions, continents and location IDs do not award XP", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  for (const [kind, region, location] of [
    ["purchase", "asia", "office"], ["discovery", "moon", "office"],
    ["encounter", "asia", "border"], ["discovery", "asia", "office:airport"],
    ["discovery", null, "office"], ["encounter", "asia", null]
  ]) assert.deepEqual(api.recordWardrobeProgress(progress, kind, region, location), []);
  assert.equal(api.wardrobeXP(progress), 0);
});

test("regional clothing requires three distinct local landmarks plus a local encounter", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  for (let repeat = 0; repeat < 4; repeat++) api.recordWardrobeProgress(progress, "discovery", "asia", "office");
  discover(api, progress, "asia", ["airport"]);
  api.recordWardrobeProgress(progress, "encounter", "asia", "customs");
  assert.equal(api.isOutfitUnlocked(progress, "asia"), false);
  const unlocked = api.recordWardrobeProgress(progress, "discovery", "asia", "immigration");
  assert.ok(unlocked.some((outfit) => outfit.id === "asia"));
  assert.equal(api.isOutfitUnlocked(progress, "asia"), true);
  assert.deepEqual(api.recordWardrobeProgress(progress, "discovery", "asia", "immigration"), []);
});

test("discoveries or XP earned elsewhere do not bypass a region's own requirements", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  discover(api, progress, "asia", ["office", "airport", "immigration"]);
  discover(api, progress, "europe", locations);
  api.recordWardrobeProgress(progress, "encounter", "europe", "customs");
  assert.equal(api.isOutfitUnlocked(progress, "asia"), false);
  assert.equal(api.isOutfitUnlocked(progress, "europe"), true);
  api.recordWardrobeProgress(progress, "encounter", "asia", "office");
  assert.equal(api.isOutfitUnlocked(progress, "asia"), true);
});

test("all seven continents can unlock in any visiting order", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  const freeOrder = ["antarctica", "africa", "europe", "asia", "oceania", "south-america", "north-america"];
  for (const region of freeOrder) {
    const unlocked = unlockRegion(api, progress, region);
    assert.ok(unlocked.some((outfit) => outfit.id === region), `${region} should unlock on its own fourth distinct action`);
    assert.equal(api.isOutfitUnlocked(progress, region), true);
  }
  assert.equal(api.wardrobeXP(progress), 63);
  assert.equal(api.OUTFITS.filter((outfit) => api.isOutfitUnlocked(progress, outfit)).length, 10);
});

test("the basic growth family automatically upgrades at exactly 12 and 36 XP", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  discover(api, progress, "asia", locations.slice(0, 5));
  assert.equal(api.wardrobeXP(progress), 10);
  assert.equal(progress.equipped, "basic");
  assert.deepEqual(discover(api, progress, "asia", [locations[5]]).map((outfit) => outfit.id), ["voyager"]);
  assert.equal(progress.equipped, "voyager");
  discover(api, progress, "asia", locations.slice(6));
  discover(api, progress, "europe", locations.slice(0, 8));
  assert.equal(api.wardrobeXP(progress), 34);
  assert.equal(progress.equipped, "voyager");
  assert.deepEqual(discover(api, progress, "europe", [locations[8]]).map((outfit) => outfit.id), ["master"]);
  assert.equal(api.wardrobeXP(progress), 36);
  assert.equal(progress.equipped, "master");
});

test("XP upgrades never overwrite a player's equipped regional outfit", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  unlockRegion(api, progress, "asia");
  assert.equal(api.equipOutfit(progress, "asia"), true);
  discover(api, progress, "europe", locations);
  discover(api, progress, "africa", locations);
  assert.ok(api.wardrobeXP(progress) >= 36);
  assert.equal(api.isOutfitUnlocked(progress, "master"), true);
  assert.equal(progress.equipped, "asia");
});

test("locked, unknown or forged outfits cannot be equipped", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  for (const id of ["master", "asia", "unknown", null]) assert.equal(api.equipOutfit(progress, id), false);
  assert.equal(api.isOutfitUnlocked(progress, { id: "master", requiredXP: 0, region: null }), false);
  assert.equal(progress.equipped, "basic");
  discover(api, progress, "asia", locations.slice(0, 6));
  assert.equal(api.equipOutfit(progress, "voyager"), true);
  assert.equal(progress.equipped, "voyager");
});

test("version-one plain JSON round-trips unique progress and an unlocked regional outfit", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress();
  unlockRegion(api, progress, "oceania");
  api.equipOutfit(progress, "oceania");
  const serialized = api.serializeWardrobeProgress(progress);
  assert.equal(serialized.version, 1);
  assert.ok(Array.isArray(serialized.discoveries) && Array.isArray(serialized.encounters));
  const restored = api.createWardrobeProgress(JSON.parse(JSON.stringify(serialized)));
  assert.deepEqual([...restored.discoveries], [...progress.discoveries]);
  assert.deepEqual([...restored.encounters], [...progress.encounters]);
  assert.equal(api.wardrobeXP(restored), 9);
  assert.equal(restored.equipped, "oceania");
});

test("damaged and duplicate stored records are ignored rather than trusted as XP", async () => {
  const api = await wardrobe();
  const saved = {
    version: 1, equipped: "master", xp: 99999, unlocked: ["master", "asia"],
    discoveries: ["asia:office", "asia:office", "asia:airport", "moon:office", "asia:border", "asia:office:airport", null, 42, {}],
    encounters: ["asia:customs", "asia:customs", "africa:unknown", false]
  };
  const progress = api.createWardrobeProgress(saved);
  assert.deepEqual([...progress.discoveries], ["asia:office", "asia:airport"]);
  assert.deepEqual([...progress.encounters], ["asia:customs"]);
  assert.equal(api.wardrobeXP(progress), 7);
  assert.equal(progress.equipped, "basic");
  assert.equal(api.isOutfitUnlocked(progress, "master"), false);
});

test("restoring a locked regional selection falls back to the highest earned growth tier", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress({ version: 1, discoveries: locations.slice(0, 6).map((id) => `asia:${id}`), encounters: [], equipped: "antarctica" });
  assert.equal(api.wardrobeXP(progress), 12);
  assert.equal(progress.equipped, "voyager");
  const master = api.createWardrobeProgress({ version: 1, discoveries: [...locations.map((id) => `asia:${id}`), ...locations.map((id) => `europe:${id}`)], encounters: [], equipped: "basic" });
  assert.equal(master.equipped, "basic", "A deliberately selected starter outfit must survive reload");
});

test("unsupported saves and invalid collection types produce a clean starter wardrobe", async () => {
  const api = await wardrobe();
  for (const saved of [undefined, null, [], "bad json", {}, { version: 2, discoveries: ["asia:office"] }, { version: 1, discoveries: "asia:office", encounters: 3, equipped: "unknown" }]) {
    const progress = api.createWardrobeProgress(saved);
    assert.equal(api.wardrobeXP(progress), 0);
    assert.equal(progress.equipped, "basic");
  }
});

test("a damaged non-string saved outfit cannot become the equipped ID", async () => {
  const api = await wardrobe();
  const progress = api.createWardrobeProgress({ version: 1, equipped: { id: "basic" }, discoveries: [], encounters: [] });
  assert.equal(progress.equipped, "basic");
});

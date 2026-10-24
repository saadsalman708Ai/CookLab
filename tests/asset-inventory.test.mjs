import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseAssetInventory } from "../src/features/assets/parseInventory.ts";
import { validatePlanAssetReferences } from "../src/features/assets/validatePlanAssetReferences.ts";
import { parsePlan } from "../src/features/plan/parsePlan.ts";

const inventoryUrl = new URL("./fixtures/asset-inventory.synthetic.json", import.meta.url);
const planUrl = new URL("./fixtures/sample-plan.demo.json", import.meta.url);

async function loadInventory() {
  return parseAssetInventory(await readFile(inventoryUrl, "utf8"));
}

async function loadPlan() {
  const result = parsePlan(await readFile(planUrl, "utf8"));
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("The demonstration plan should parse for this test.");
  return result.plan;
}

function inventoryText(overrides = {}) {
  return JSON.stringify({
    inventoryVersion: 1,
    themes: [],
    music: [],
    ...overrides,
  });
}

test("a versioned synthetic inventory passes validation", async () => {
  const result = await loadInventory();
  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) assert.equal(result.inventory.inventoryVersion, 1);
});

test("invalid inventory JSON returns a useful parse error", () => {
  const result = parseAssetInventory('{"inventoryVersion":');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors[0].keyword, "parse");
    assert.match(result.errors[0].message, /Invalid JSON/);
  }
});

test("missing or unsupported inventory versions are rejected", () => {
  for (const input of [inventoryText({ inventoryVersion: 2 }), inventoryText({ inventoryVersion: undefined })]) {
    const result = parseAssetInventory(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.some((error) => error.path === "/inventoryVersion"));
  }
});

test("required fields and invalid field types are rejected with paths", () => {
  const missing = parseAssetInventory(inventoryText({ themes: [{ id: "theme.x" }] }));
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.ok(missing.errors.some((error) => error.path === "/themes/0/name"));

  const invalidType = parseAssetInventory(inventoryText({ music: "not-an-array" }));
  assert.equal(invalidType.ok, false);
  if (!invalidType.ok) assert.ok(invalidType.errors.some((error) => error.path === "/music"));
});

test("duplicate IDs across categories are rejected and IDs are case-sensitive", () => {
  const duplicate = parseAssetInventory(inventoryText({
    themes: [{ id: "shared.id", name: "Theme", relativePath: "themes/a.mp4" }],
    music: [{ id: "shared.id", name: "Music", relativePath: "music/a.mp3" }],
  }));
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.ok(duplicate.errors.some((error) => error.keyword === "duplicateId" && error.path === "/music/0/id"));

  const distinctCase = parseAssetInventory(inventoryText({
    themes: [{ id: "shared.id", name: "Theme", relativePath: "themes/a.mp4" }],
    music: [{ id: "Shared.id", name: "Music", relativePath: "music/a.mp3" }],
  }));
  assert.equal(distinctCase.ok, true, JSON.stringify(distinctCase));
});

test("rooted, drive-prefixed, backslash, and traversing paths are rejected", () => {
  for (const relativePath of ["/themes/a.mp4", "C:/themes/a.mp4", "themes\\a.mp4", "themes/../a.mp4"]) {
    const result = parseAssetInventory(inventoryText({
      themes: [{ id: "theme.x", name: "Theme", relativePath }],
    }));
    assert.equal(result.ok, false, relativePath);
    if (!result.ok) assert.ok(result.errors.some((error) => error.path === "/themes/0/relativePath"), relativePath);
  }
});

test("empty theme and music collections are valid", () => {
  const result = parseAssetInventory(inventoryText());
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("theme and music references resolve from their matching inventory categories", async () => {
  const plan = await loadPlan();
  plan.themes[0].file = "synthetic-theme.mp4";
  plan.music[0].file = "synthetic-music.mp3";
  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (inventory.ok) assert.deepEqual(validatePlanAssetReferences(plan, inventory.inventory), []);
});

test("missing theme and music filenames are reported at their plan paths", async () => {
  const plan = await loadPlan();
  plan.themes[0].file = "missing-theme.mp4";
  plan.music[0].file = "missing-music.mp3";
  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (inventory.ok) {
    const errors = validatePlanAssetReferences(plan, inventory.inventory);
    assert.deepEqual(errors.map((error) => error.path), ["/themes/0/file", "/music/0/file"]);
    assert.match(errors[0].message, /filename "missing-theme.mp4" was not found in the theme inventory/);
    assert.match(errors[1].message, /filename "missing-music.mp3" was not found in the music inventory/);
  }
});

test("filenames resolving to the opposite category report wrong-category errors", async () => {
  const plan = await loadPlan();
  plan.themes[0].file = "synthetic-music.mp3";
  plan.music[0].file = "synthetic-theme.mp4";
  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (inventory.ok) {
    const errors = validatePlanAssetReferences(plan, inventory.inventory);
    assert.equal(errors.length, 2);
    assert.ok(errors.every((error) => /wrong category/.test(error.message)));
  }
});

test("reference diagnostics are deterministic and inputs are not mutated", async () => {
  const plan = await loadPlan();
  plan.themes[0].file = "synthetic-theme.mp4";
  plan.themes.push({ ...plan.themes[0], file: "missing-theme.mp4" });
  plan.music[0].file = "synthetic-theme.mp4";
  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (inventory.ok) {
    const planBefore = structuredClone(plan);
    const inventoryBefore = structuredClone(inventory.inventory);
    const errors = validatePlanAssetReferences(plan, inventory.inventory);
    assert.deepEqual(errors.map(({ path, filename }) => [path, filename]), [
      ["/themes/1/file", "missing-theme.mp4"],
      ["/music/0/file", "synthetic-theme.mp4"],
    ]);
    assert.deepEqual(plan, planBefore);
    assert.deepEqual(inventory.inventory, inventoryBefore);
  }
});

test("plans without theme or music references remain valid", async () => {
  const plan = await loadPlan();
  plan.themes = [];
  plan.music = [];
  const parsed = parsePlan(JSON.stringify(plan));
  assert.equal(parsed.ok, true, JSON.stringify(parsed));

  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (parsed.ok && inventory.ok) {
    assert.deepEqual(validatePlanAssetReferences(parsed.plan, inventory.inventory), []);
  }
});

test("asset filenames cannot escape their configured inventory roots", async () => {
  const plan = await loadPlan();
  plan.themes[0].file = "../synthetic-theme.mp4";
  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (inventory.ok) {
    const errors = validatePlanAssetReferences(plan, inventory.inventory);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].path, "/themes/0/file");
    assert.match(errors[0].message, /single filename without path separators/);
  }
});

test("duplicate basenames in the expected category are reported as ambiguous", async () => {
  const plan = await loadPlan();
  const inventory = await loadInventory();
  assert.equal(inventory.ok, true);
  if (inventory.ok) {
    inventory.inventory.themes.push({
      id: "theme.duplicate",
      name: "Duplicate basename",
      relativePath: "alternate/synthetic-theme.mp4",
    });
    const errors = validatePlanAssetReferences(plan, inventory.inventory);
    assert.ok(errors.some((error) => error.path === "/themes/0/file" && /ambiguous/.test(error.message)));
  }
});

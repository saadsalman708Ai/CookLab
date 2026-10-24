import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parsePlan } from "../src/features/plan/parsePlan.ts";

const sampleUrl = new URL("./fixtures/sample-plan.demo.json", import.meta.url);

async function loadSamplePlan() {
  return JSON.parse(await readFile(sampleUrl, "utf8"));
}

test("the demonstration compact plan passes V1 structural and semantic validation", async () => {
  const sample = await readFile(sampleUrl, "utf8");
  const result = parsePlan(sample);

  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) {
    assert.equal(result.plan.schemaVersion, 1);
    assert.ok(result.plan.transcript.length > 0);
    assert.ok(result.plan.segments.length > 0);
  }
});

test("an empty transcript is rejected with an actionable semantic error", async () => {
  const sample = await loadSamplePlan();
  sample.transcript = [];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) =>
      error.path === "/transcript" &&
      error.keyword === "semantic" &&
      /at least one word/.test(error.message),
    ));
  }
});

test("empty segments are rejected with an actionable semantic error", async () => {
  const sample = await loadSamplePlan();
  sample.segments = [];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) =>
      error.path === "/segments" &&
      error.keyword === "semantic" &&
      /at least one semantic segment/.test(error.message),
    ));
  }
});

test("legacy plan fields and transcript wrapper are rejected", async () => {
  const sample = await loadSamplePlan();
  sample.niche = "legacy field";
  sample.transcript = { words: sample.transcript };
  sample.segments[0].id = "legacy-segment-id";
  sample.themeRegions = [];
  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/niche"));
    assert.ok(result.errors.some((error) => error.path === "/transcript"));
    assert.ok(result.errors.some((error) => error.path === "/segments/0/id"));
    assert.ok(result.errors.some((error) => error.path === "/themeRegions"));
  }
});

test("unknown fields are rejected with the exact property path", async () => {
  const sample = await loadSamplePlan();
  sample.segments[0].footage.unapprovedField = "ignored fields are not accepted";
  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.path === "/segments/0/footage/unapprovedField"));
});

test("malformed JSON returns a useful parse error", () => {
  const result = parsePlan('{ "schemaVersion": 1,');

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors[0].message, /Invalid JSON/);
    assert.equal(result.errors[0].keyword, "parse");
  }
});

test("a missing required field is rejected with its path", async () => {
  const sample = JSON.parse(await readFile(sampleUrl, "utf8"));
  delete sample.title;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/title"));
    assert.ok(result.errors.some((error) => /Missing required property/.test(error.message)));
  }
});

test("a malformed word tuple is rejected at its location", async () => {
  const sample = JSON.parse(await readFile(sampleUrl, "utf8"));
  sample.transcript[0] = [0.2, 0.6];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/0"));
  }
});

test("natural gaps between word intervals are allowed", async () => {
  const sample = await loadSamplePlan();
  assert.ok(sample.transcript[1][0] > sample.transcript[0][1]);

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, true, JSON.stringify(result));
});

test("a word interval with end not greater than start is rejected", async () => {
  const sample = await loadSamplePlan();
  sample.transcript[0][1] = sample.transcript[0][0];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/0"));
    assert.ok(result.errors.some((error) => /must be greater than its start/.test(error.message)));
  }
});

test("word starts must remain in chronological order", async () => {
  const sample = await loadSamplePlan();
  sample.transcript[1] = [0.1, 0.15, sample.transcript[1][2]];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/1" && /chronological order/.test(error.message)));
  }
});

test("a word start outside every segment is reported", async () => {
  const sample = await loadSamplePlan();
  sample.segments[0].start = 0.3;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/0" && /not covered/.test(error.message)));
  }
});

test("a word start covered by two segments is reported", async () => {
  const sample = await loadSamplePlan();
  sample.segments[0].end = 5;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/15" && /multiple segments: 0, 1/.test(error.message)));
  }
});

test("a word starting at one segment's end belongs to the next half-open interval", async () => {
  const sample = await loadSamplePlan();
  sample.transcript[15] = [4.6, 4.7, sample.transcript[15][2]];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, true, JSON.stringify(result));
});

test("a segment with end not greater than start is rejected", async () => {
  const sample = await loadSamplePlan();
  sample.segments[0].start = 0.2;
  sample.segments[0].end = 0.1;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/segments/0/end" && /must be greater than its start/.test(error.message)));
  }
});

test("segments must remain in chronological order", async () => {
  const sample = await loadSamplePlan();
  [sample.segments[0], sample.segments[1]] = [sample.segments[1], sample.segments[0]];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/segments/1/start" && /chronological order/.test(error.message)));
  }
});

test("a negative word timestamp is rejected", async () => {
  const sample = await loadSamplePlan();
  sample.transcript[0][0] = -0.1;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/0/0"));
  }
});

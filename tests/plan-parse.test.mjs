import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parsePlan } from "../src/features/plan/parsePlan.ts";

const sampleUrl = new URL("./fixtures/sample-plan.demo.json", import.meta.url);

async function loadSamplePlan() {
  return JSON.parse(await readFile(sampleUrl, "utf8"));
}

test("the demonstration sample plan passes V1 structural validation", async () => {
  const sample = await readFile(sampleUrl, "utf8");
  const result = parsePlan(sample);

  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) {
    assert.equal(result.plan.schemaVersion, 1);
    assert.ok(result.plan.transcript.words.length > 0);
    assert.ok(result.plan.segments.length > 0);
  }
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
  sample.transcript.words[0] = [0.2, 0.6];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/words/0"));
  }
});

test("natural gaps between word intervals are allowed", async () => {
  const sample = await loadSamplePlan();
  assert.ok(sample.transcript.words[1][0] > sample.transcript.words[0][1]);

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, true, JSON.stringify(result));
});

test("a word interval with end not greater than start is rejected", async () => {
  const sample = await loadSamplePlan();
  sample.transcript.words[0][1] = sample.transcript.words[0][0];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/words/0"));
    assert.ok(result.errors.some((error) => /must be greater than its start/.test(error.message)));
  }
});

test("word starts must remain in chronological order", async () => {
  const sample = await loadSamplePlan();
  sample.transcript.words[1] = [0.1, 0.15, sample.transcript.words[1][2]];

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/words/1" && /chronological order/.test(error.message)));
  }
});

test("a word start outside every segment is reported", async () => {
  const sample = await loadSamplePlan();
  sample.segments[0].start = 0.3;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/words/0" && /not covered/.test(error.message)));
  }
});

test("a word start covered by two segments is reported", async () => {
  const sample = await loadSamplePlan();
  sample.segments[0].end = 5;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/words/15" && /multiple segments: 0, 1/.test(error.message)));
  }
});

test("a word starting at one segment's end belongs to the next half-open interval", async () => {
  const sample = await loadSamplePlan();
  sample.transcript.words[15] = [4.6, 4.7, sample.transcript.words[15][2]];

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
  sample.transcript.words[0][0] = -0.1;

  const result = parsePlan(JSON.stringify(sample));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.path === "/transcript/words/0/0"));
  }
});

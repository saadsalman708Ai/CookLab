import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parsePlan } from "../src/features/plan/parsePlan.ts";

const sampleUrl = new URL("./fixtures/sample-plan.demo.json", import.meta.url);

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

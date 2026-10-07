import test from "node:test";
import assert from "node:assert/strict";
import { mediaWikiRequest, createRun } from "../src/mediawiki.js";
test("429 : respecte Retry-After avant une réponse réussie", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const waits = [];
  globalThis.fetch = async () =>
    ++calls === 1
      ? new Response("Too many requests", {
          status: 429,
          headers: { "Retry-After": "2" },
        })
      : new Response(JSON.stringify({ query: { pages: [] } }), { status: 200 });
  try {
    const run = createRun();
    await mediaWikiRequest("https://fr.wikipedia.org/w/api.php", {}, run, {
      minInterval: 0,
      wait: async (r, ms) => {
        waits.push(ms);
        r.nextAllowedAt = 0;
      },
    });
    assert.equal(calls, 2);
    assert.ok(waits.some((n) => n >= 2000));
  } finally {
    globalThis.fetch = original;
  }
});
test("panne persistante : tentatives bornées et erreur explicite", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("Unavailable", { status: 503 });
  };
  try {
    await assert.rejects(
      mediaWikiRequest("https://fr.wikipedia.org/w/api.php", {}, createRun(), {
        retries: 2,
        minInterval: 0,
        wait: async (r) => {
          r.nextAllowedAt = 0;
        },
      }),
    );
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
  }
});

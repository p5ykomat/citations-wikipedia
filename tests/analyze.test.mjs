import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "linkedom";
import { runSearch, classifyCitationsHtml } from "../src/analyze.js";
import { normalizeQuery } from "../src/utils.js";
import { createRun } from "../src/mediawiki.js";
const site = { code: "fr", url: "https://fr.wikipedia.org" };
const row = (id, url, ns = 0) => ({
  pageid: id,
  title: `Article ${id}`,
  url,
  ns,
});
test("pagination vide intermédiaire, doublons et namespaces", async () => {
  let n = 0;
  const request = async () => {
    n++;
    return n === 1
      ? { continue: { eucontinue: "a" }, query: { exturlusage: [] } }
      : n === 2
        ? {
            continue: { eucontinue: "b" },
            query: {
              exturlusage: [
                row(1, "https://example.org/a"),
                row(1, "https://example.org/a"),
                row(2, "https://example.org/a", 1),
              ],
            },
          }
        : {
            query: {
              exturlusage: [
                row(1, "https://example.org/b"),
                row(3, "https://example.org/a"),
              ],
            },
          };
  };
  const r = await runSearch({
    values: ["example.org"],
    mode: "domain",
    run: createRun(),
    request,
    sitesOverride: [site],
  });
  assert.equal(r.articleCount, 2);
  assert.equal(r.linkCount, 3);
  assert.equal(r.summaries[0].distinctUrls, 2);
  assert.equal(n, 3);
});
test("sources qui se recouvrent : total global non doublé", async () => {
  const request = async () => ({
    query: { exturlusage: [row(1, "https://sub.example.org/a")] },
  });
  const r = await runSearch({
    values: ["example.org", "sub.example.org"],
    mode: "domain",
    run: createRun(),
    request,
    sitesOverride: [site],
  });
  assert.equal(r.linkCount, 1);
  assert.equal(r.articleCount, 1);
  assert.equal(r.summaries.length, 2);
});
test("URL distincte entre langues dédoublonnée par source", async () => {
  const request = async () => ({
    query: { exturlusage: [row(1, "https://example.org/a")] },
  });
  const r = await runSearch({
    values: ["example.org"],
    mode: "domain",
    run: createRun(),
    request,
    sitesOverride: [site, { code: "en", url: "https://en.wikipedia.org" }],
  });
  assert.equal(r.articleCount, 2);
  assert.equal(r.linkCount, 2);
  assert.equal(r.summaries[0].distinctUrls, 1);
});
test("échec sur un wiki : conserve les autres et signale la couverture", async () => {
  const request = async (api) => {
    if (api.includes("en.wikipedia")) throw new Error("HTTP 503");
    return { query: { exturlusage: [row(1, "https://example.org/a")] } };
  };
  const r = await runSearch({
    values: ["example.org"],
    mode: "domain",
    run: createRun(),
    request,
    sitesOverride: [site, { code: "en", url: "https://en.wikipedia.org" }],
  });
  assert.equal(r.articleCount, 1);
  assert.equal(r.failures.length, 1);
});
test("références réelles distinctes des liens de bibliographie et lien externe", () => {
  const html =
    '<p><a href="https://example.org/hors">Lien externe</a></p><ol class="references"><li id="cite_note-1"><a href="https://example.org/a">a</a><a href="https://example.org/b">b</a></li><li id="cite_note-2"><a href="https://example.org/a">a</a></li></ol>';
  const r = classifyCitationsHtml(
    html,
    normalizeQuery("example.org", "domain"),
    DOMParser,
  );
  assert.equal(r.referenceNotes, 2);
  assert.equal(r.referenceUrls.length, 2);
  assert.deepEqual(r.otherUrls, ["https://example.org/hors"]);
});
test("pause conserve un checkpoint et reprend sans recompter les premières pages", async () => {
  let checkpoint;
  const run = createRun();
  let firstCalls = 0;
  const first = await runSearch({
    values: ["example.org"],
    mode: "domain",
    run,
    sitesOverride: [site],
    request: async () => {
      firstCalls++;
      return {
        continue: { eucontinue: "next" },
        query: { exturlusage: [row(1, "https://example.org/a")] },
      };
    },
    onCheckpoint: (state) => {
      checkpoint = structuredClone(state);
      run.abort();
    },
  });
  assert.equal(first.articleCount, 1);
  assert.equal(first.canResume, true);
  assert.equal(firstCalls, 1);
  let nextCalls = 0;
  const final = await runSearch({
    values: ["example.org"],
    mode: "domain",
    run: createRun(),
    sitesOverride: [site],
    checkpoint,
    request: async (api, p) => {
      nextCalls++;
      assert.equal(p.eucontinue, "next");
      return {
        query: {
          exturlusage: [
            row(1, "https://example.org/a"),
            row(2, "https://example.org/b"),
          ],
        },
      };
    },
  });
  assert.equal(nextCalls, 1);
  assert.equal(final.articleCount, 2);
  assert.equal(final.linkCount, 2);
  assert.equal(final.partial, false);
});

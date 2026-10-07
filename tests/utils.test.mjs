import test from "node:test";
import assert from "node:assert/strict";
import { csvText, normalizeQuery, normalizeUrl } from "../src/utils.js";

test("normalise un domaine et accepte ses sous-domaines", () => {
  const query = normalizeQuery("https://www.bnf.fr/catalogue", "domain");
  assert.equal(query.display, "bnf.fr");
  assert.equal(query.apiQuery, "*.bnf.fr");
  assert.equal(query.matches("https://www.bnf.fr/page"), true);
  assert.equal(query.matches("https://data.www.bnf.fr/page"), true);
  assert.equal(query.matches("https://notbnf.fr/page"), false);
});

test("compare une URL exacte sans tenir compte du protocole ni du slash final", () => {
  const query = normalizeQuery("https://example.org/article/", "url");
  assert.equal(query.matches("http://example.org/article"), true);
  assert.equal(query.matches("https://example.org/article?x=1"), false);
  assert.equal(normalizeUrl("example.org/"), "example.org/");
});

test("rejette une saisie vide ou un domaine incomplet", () => {
  assert.throws(() => normalizeQuery("", "domain"), /Saisissez/);
  assert.throws(() => normalizeQuery("localhost", "domain"), /domaine valide/);
});

test("échappe les cellules CSV", () => {
  const csv = csvText([
    ["source", "note"],
    ["example.org", 'a;"b"'],
  ]);
  assert.match(csv, /"a;""b"""/);
});

test("neutralise une formule dans un export CSV", () => {
  assert.match(csvText([["=1+1"]]), /'=1\+1/);
});

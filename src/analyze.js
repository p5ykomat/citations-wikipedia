import {
  mediaWikiRequest,
  continuationParams,
  getWikipediaSites,
} from "./mediawiki.js";
import { normalizeQuery, pageUrl } from "./utils.js";
import { parseHtml, matchingLinks } from "./html.js";
const SITES = {
  fr: { code: "fr", url: "https://fr.wikipedia.org" },
  en: { code: "en", url: "https://en.wikipedia.org" },
  de: { code: "de", url: "https://de.wikipedia.org" },
};
export function classifyCitationsHtml(html, query, Parser) {
  const doc = parseHtml(html, Parser),
    notes = new Set(),
    links = [];
  for (const { node, url } of matchingLinks(doc, query)) {
    const note = node.closest(
      'li[id^="cite_note"], li[about][id^="cite_note"], .mw-reference-text',
    );
    const inReferences = Boolean(node.closest(".references, .mw-references"));
    if (note && inReferences) notes.add(note);
    links.push({ url, inReference: Boolean(note && inReferences) });
  }
  return {
    referenceNotes: notes.size,
    referenceUrls: [
      ...new Set(links.filter((l) => l.inReference).map((l) => l.url)),
    ],
    otherUrls: [
      ...new Set(links.filter((l) => !l.inReference).map((l) => l.url)),
    ],
  };
}
export async function inspectArticle(
  article,
  query,
  run,
  request = mediaWikiRequest,
  Parser,
) {
  const data = await request(
    `${article.site.url}/w/api.php`,
    {
      action: "parse",
      page: article.title,
      prop: "text|revid",
      disableeditsection: 1,
    },
    run,
  );
  if (typeof data.parse?.text !== "string")
    throw new Error("Page non lisible.");
  return {
    ...classifyCitationsHtml(data.parse.text, query, Parser),
    revision: data.parse.revid,
  };
}
export async function runSearch({
  values,
  mode,
  scope = "fr",
  run,
  update = () => {},
  request = mediaWikiRequest,
  sitesOverride,
}) {
  const queries = [
    ...new Map(
      values
        .filter((v) => v.trim())
        .map((v) => {
          const q = normalizeQuery(v, mode);
          return [`${q.mode}:${q.display}`, q];
        }),
    ).values(),
  ];
  if (!queries.length)
    throw new Error("Saisissez au moins un domaine ou une URL.");
  const sites =
    sitesOverride ||
    (scope === "all"
      ? await getWikipediaSites(run)
      : scope === "core"
        ? Object.values(SITES)
        : [SITES[scope] || SITES.fr]);
  if (!sites.length) throw new Error("Aucune Wikipédia disponible.");
  const summaries = [],
    failures = [],
    globalPairs = new Set(),
    globalPages = new Set();
  let done = 0;
  for (const query of queries) {
    const articles = new Map(),
      urls = new Set(),
      pairs = new Set();
    for (const site of sites) {
      let continuation = null;
      const sitePairs = new Set(),
        siteArticles = new Map(),
        siteUrls = new Set();
      try {
        do {
          run.status(
            `${query.display} · Wikipédia ${site.code} · ${sitePairs.size} liens`,
          );
          const data = await request(
            `${site.url}/w/api.php`,
            {
              list: "exturlusage",
              euprop: "ids|title|url",
              eulimit: "max",
              eunamespace: 0,
              euquery: query.apiQuery,
              ...(continuation || {}),
            },
            run,
          );
          for (const row of data.query?.exturlusage || []) {
            if (row.ns !== 0 || !query.matches(row.url)) continue;
            const key = `${site.code}:${row.pageid || row.title}`,
              pair = `${key}\t${row.url}`;
            if (sitePairs.has(pair)) continue;
            sitePairs.add(pair);
            siteUrls.add(row.url);
            const article = siteArticles.get(key) || {
              key,
              title: row.title,
              site,
              url: pageUrl(site.url, row.title),
              urls: [],
            };
            article.urls.push(row.url);
            siteArticles.set(key, article);
          }
          continuation = continuationParams(data);
        } while (continuation);
      } catch (error) {
        if (run.aborted) throw error;
        failures.push({
          source: query.display,
          wiki: site.code,
          message: error.message,
        });
      }
      for (const [key, a] of siteArticles) {
        articles.set(key, a);
        globalPages.add(key);
      }
      for (const u of siteUrls) urls.add(u);
      for (const pair of sitePairs) {
        pairs.add(pair);
        globalPairs.add(pair);
      }
      update(++done, queries.length * sites.length);
    }
    summaries.push({
      query,
      articles: [...articles.values()].sort(
        (a, b) => b.urls.length - a.urls.length,
      ),
      articleCount: articles.size,
      linkCount: pairs.size,
      distinctUrls: urls.size,
    });
  }
  return {
    summaries,
    linkCount: globalPairs.size,
    articleCount: globalPages.size,
    failures,
    scannedAt: new Date(),
    scope,
    sites,
  };
}

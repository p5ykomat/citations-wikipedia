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
  checkpoint,
  onCheckpoint = () => {},
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
  const signature = JSON.stringify([
    queries.map((q) => [q.mode, q.display]),
    scope,
  ]);
  const saved = checkpoint?.signature === signature ? checkpoint : null;
  const sites =
    sitesOverride ||
    saved?.sites ||
    (scope === "all"
      ? await getWikipediaSites(run)
      : scope === "core"
        ? Object.values(SITES)
        : [SITES[scope] || SITES.fr]);
  if (!sites.length) throw new Error("Aucune Wikipédia disponible.");
  const state = saved || {
    signature,
    sites,
    tasks: {},
    startedAt: new Date().toISOString(),
  };
  function snapshot() {
    const globalPages = new Set(),
      globalPairs = new Set(),
      failures = [];
    const summaries = queries.map((query) => {
      const articles = [],
        urls = new Set();
      let count = 0;
      for (const site of sites) {
        const task = state.tasks[`${query.display}|${site.code}`];
        if (!task) continue;
        if (task.error)
          failures.push({
            source: query.display,
            wiki: site.code,
            message: task.error,
          });
        for (const a of task.articles) {
          articles.push(a);
          globalPages.add(a.key);
          count += a.urls.length;
          for (const u of a.urls) {
            urls.add(u);
            globalPairs.add(`${a.key}\t${u}`);
          }
        }
      }
      return {
        query,
        articles: articles.sort((a, b) => b.urls.length - a.urls.length),
        articleCount: articles.length,
        linkCount: count,
        distinctUrls: urls.size,
      };
    });
    const complete =
      Object.values(state.tasks).filter((t) => t.complete).length ===
      queries.length * sites.length;
    return {
      summaries,
      articleCount: globalPages.size,
      linkCount: globalPairs.size,
      failures,
      scannedAt: new Date(),
      startedAt: state.startedAt,
      scope,
      sites,
      partial: !complete,
      canResume: !complete,
    };
  }
  const save = () => onCheckpoint(state, snapshot());
  outer: for (const query of queries)
    for (const site of sites) {
      if (run.aborted) break outer;
      const key = `${query.display}|${site.code}`;
      const task = (state.tasks[key] ||= {
        articles: [],
        continuation: null,
        complete: false,
      });
      if (task.complete) continue;
      const articles = new Map(task.articles.map((a) => [a.key, a]));
      delete task.error;
      try {
        do {
          if (run.aborted) break;
          run.status(
            `${query.display} · Wikipédia ${site.code} · ${articles.size} articles déjà trouvés`,
          );
          const data = await request(
            `${site.url}/w/api.php`,
            {
              list: "exturlusage",
              euprop: "ids|title|url",
              eulimit: 100,
              eunamespace: 0,
              euquery: query.apiQuery,
              ...(task.continuation || {}),
            },
            run,
          );
          for (const row of data.query?.exturlusage || []) {
            if (row.ns !== 0 || !query.matches(row.url)) continue;
            const k = `${site.code}:${row.pageid || row.title}`;
            const a = articles.get(k) || {
              key: k,
              title: row.title,
              site,
              url: pageUrl(site.url, row.title),
              urls: [],
            };
            if (!a.urls.includes(row.url)) a.urls.push(row.url);
            articles.set(k, a);
          }
          task.articles = [...articles.values()];
          task.continuation = continuationParams(data);
          task.complete = !task.continuation;
          save();
        } while (task.continuation && !run.aborted);
      } catch (error) {
        task.error = run.aborted ? "Relevé mis en pause." : error.message;
        save();
        if (run.aborted) break outer;
      }
      update(
        Object.values(state.tasks).filter((t) => t.complete).length,
        queries.length * sites.length,
      );
    }
  save();
  return snapshot();
}

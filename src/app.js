import * as backend from "./analyze.js";
import { createRun } from "./mediawiki.js";
import {
  element as el,
  downloadCsv,
  normalizeQuery,
  formatDate,
  numberFormat,
} from "./utils.js";
const $ = (s) => document.querySelector(s),
  kind = document.body.dataset.kind,
  isCommons = kind === "commons";
const variant =
  new URLSearchParams(location.search).get("v") === "2" ? "2" : "1";
document.body.classList.toggle("v2", variant === "2");
$(`.version-switch a[href^="?v=${variant}"]`).setAttribute(
  "aria-current",
  "page",
);
const labels = {
  source: "Lien dans la source",
  institution: "Lien dans l’institution",
  other: "Lien ailleurs",
  unverified: "À vérifier",
};
let result = null,
  run = null,
  isDemo = false,
  filter = "all",
  usageBusy = false;
function link(url, text) {
  return el("a", {
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
    text,
  });
}
function metric(value, label) {
  return el("div", { className: "metric" }, [
    el("strong", { text: numberFormat.format(value) }),
    el("span", { text: label }),
  ]);
}
function busy(value) {
  for (const c of $("#search").elements) c.disabled = value;
  $("#stop").disabled = !value;
  $("#export").disabled = value || !result;
  $("#search").setAttribute("aria-busy", String(value));
}
function modal(content) {
  $("#detail-content").replaceChildren(...content);
  if (!$("#detail").open) $("#detail").showModal();
}
function error(message) {
  $("#error").textContent = message;
  $("#error").hidden = !message;
}
for (const b of document.querySelectorAll("[data-dialog]"))
  b.onclick = () => $("#" + b.dataset.dialog).showModal();
for (const b of document.querySelectorAll("[data-close]"))
  b.onclick = () => b.closest("dialog").close();
$("#stop").onclick = () => run?.abort();
$("#search").onsubmit = async (event) => {
  event.preventDefault();
  error("");
  const values = $("#query")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (values.length > 5) {
    error("Limitez la recherche à cinq sources.");
    $("#query").focus();
    return;
  }
  const mode = new FormData($("#search")).get("mode");
  try {
    for (const value of values) normalizeQuery(value, mode);
  } catch (e) {
    error(e.message);
    $("#query").setAttribute("aria-invalid", "true");
    $("#query").focus();
    return;
  }
  $("#query").removeAttribute("aria-invalid");
  isDemo = false;
  $("#example").hidden = true;
  result = null;
  $("#export").disabled = true;
  $("#results").replaceChildren(
    el("p", { text: "Lecture des données publiques en cours…" }),
  );
  $("#metrics").replaceChildren();
  $("#filters").replaceChildren();
  $("#coverage").textContent = "";
  $("#notice").hidden = true;
  run = createRun((text) => ($("#status").textContent = text));
  busy(true);
  $("#progress").hidden = false;
  try {
    result = await backend.runSearch({
      values,
      mode,
      scope: $("#scope")?.value,
      limit: Number($("#limit")?.value || 50),
      run,
      update: (n, total) => {
        $("#progress").value = total ? (n / total) * 100 : 0;
      },
    });
    filter = "all";
    render();
  } catch (e) {
    error(e.message);
    $("#status").textContent = "Relevé interrompu.";
    $("#results").replaceChildren(
      el("p", {
        text: "Aucun total complet disponible. Vous pouvez relancer la recherche.",
      }),
    );
  } finally {
    run = null;
    busy(false);
    $("#progress").hidden = true;
  }
};
function render() {
  $("#example").hidden = !isDemo;
  $("#export").disabled = false;
  $("#status").textContent = isDemo
    ? "Exemple de présentation, sans appel aux API"
    : `Relevé du ${formatDate(result.scannedAt)}`;
  $("#metrics").replaceChildren();
  $("#filters").replaceChildren();
  $("#results").replaceChildren();
  $("#notice").hidden = true;
  if (isCommons) {
    const counts = Object.fromEntries(
      Object.keys(labels).map((k) => [
        k,
        result.files.filter((f) => f.status === k).length,
      ]),
    );
    $("#metrics").append(
      metric(result.files.length, "Fichiers examinés"),
      metric(counts.source, "Liens dans la source"),
      metric(counts.institution, "Dans l’institution"),
      metric(counts.other + counts.unverified, "Autres cas"),
    );
    for (const [key, name] of [
      ["all", "Tous"],
      ["source", "Source"],
      ["institution", "Institution"],
      ["other", "Ailleurs"],
      ["unverified", "À vérifier"],
    ]) {
      const b = el("button", {
        type: "button",
        text: name,
        "aria-pressed": String(filter === key),
      });
      b.onclick = () => {
        filter = key;
        render();
      };
      $("#filters").append(b);
    }
    const list = el("div", { className: "record-list" });
    for (const file of result.files.filter(
      (f) => filter === "all" || f.status === filter,
    )) {
      const record = el("article", { className: "record" }),
        title = isDemo
          ? el("span", { text: file.title.replace(/^File:/, "") })
          : link(file.url, file.title.replace(/^File:/, ""));
      record.append(
        el("div", { className: "record-top" }, [
          el("div", {
            className: "file-mark",
            "aria-hidden": "true",
            text: "▧",
          }),
          el("div", {}, [
            el("h3", {}, title),
            el("small", {
              text: isDemo ? "Notice fictive" : "Page de fichier Commons",
            }),
          ]),
        ]),
      );
      record.append(
        el("span", {
          className: `tag ${file.status}`,
          text: labels[file.status],
        }),
      );
      record.append(
        el("p", {
          className: "record-url",
          text: file.evidence[0]?.url || "Emplacement du lien non vérifié",
        }),
      );
      const detail = el("button", {
        type: "button",
        text: "Voir le lien repéré ↗",
      });
      detail.onclick = () => showEvidence(file);
      const usage = el("button", {
        type: "button",
        text: file.usage
          ? `${file.usage.length} pages utilisatrices →`
          : "Consulter les usages →",
      });
      usage.onclick = () => showUsage(file, usage);
      record.append(
        el("div", { className: "record-actions" }, [detail, usage]),
      );
      list.append(record);
    }
    $("#results").append(
      list.children.length
        ? list
        : el("p", { text: "Aucun fichier dans cette catégorie." }),
    );
    $("#coverage").textContent =
      "La présence d’un lien indique son emplacement, pas une provenance certifiée. Les liens générés par des modèles sont pris en compte dans la page affichée.";
    if (result.truncated) {
      $("#notice").textContent =
        `Limite atteinte : ${result.files.length} fichiers examinés. Ces chiffres ne représentent pas toute la collection.`;
      $("#notice").hidden = false;
    }
  } else {
    const distinct = new Set(
      result.summaries.flatMap((s) => s.articles.flatMap((a) => a.urls)),
    );
    $("#metrics").append(
      metric(result.articleCount, "Articles distincts"),
      metric(result.linkCount, "Liens article / URL"),
      metric(distinct.size, "URL distinctes"),
    );
    for (const summary of result.summaries) {
      $("#results").append(
        el("h3", { className: "source-heading" }, [
          summary.query.display,
          el("span", {
            text: `${summary.articleCount} articles · ${summary.linkCount} liens`,
          }),
        ]),
      );
      const list = el("div", { className: "citation-list" });
      for (const article of summary.articles.slice(0, 100)) {
        const action = el("button", {
          type: "button",
          text: "Vérifier les références",
        });
        action.onclick = () => showReferences(article, summary.query, action);
        list.append(
          el("article", { className: "citation-record" }, [
            el("div", {}, [
              el(
                "h3",
                {},
                isDemo
                  ? el("span", { text: article.title })
                  : link(article.url, article.title),
              ),
              el("small", {
                text: `Wikipédia ${article.site.code} · ${summary.query.display}`,
              }),
            ]),
            el("div", { className: "count" }, [
              el("strong", { text: article.urls.length }),
              el("span", { text: "liens" }),
            ]),
            action,
          ]),
        );
      }
      if (!summary.articles.length)
        list.append(
          el("p", { text: "Aucun article repéré pour cette source." }),
        );
      if (summary.articles.length > 100)
        list.append(
          el("p", {
            text: "100 articles affichés. Le fichier CSV contient la liste complète.",
          }),
        );
      $("#results").append(list);
    }
    $("#coverage").textContent =
      "Un lien répété dans le même article est compté une seule fois pour la même URL. La vérification des notes de référence se fait article par article.";
    if (result.failures.length) {
      $("#notice").textContent =
        `Relevé partiel : ${result.failures.map((f) => `${f.source} (${f.wiki}) : ${f.message}`).join(" ; ")}`;
      $("#notice").hidden = false;
    }
  }
}
function showEvidence(file) {
  const contents = [
    el("h3", { text: file.title.replace(/^File:/, "") }),
    el("p", {
      text: `Classement : ${labels[file.status]}. ${file.revision ? "Version " + file.revision + "." : ""}`,
    }),
  ];
  for (const e of file.evidence)
    contents.push(
      el("div", { className: "evidence" }, [
        el("span", {
          className: `tag ${e.context}`,
          text: labels[e.context] || "Autre emplacement",
        }),
        el("p", {}, isDemo ? el("span", { text: e.url }) : link(e.url, e.url)),
        el("p", { text: e.excerpt }),
      ]),
    );
  if (!file.evidence.length)
    contents.push(
      el("p", {
        text:
          file.error ||
          "Lien indexé mais non retrouvé dans la page affichée. Vérification manuelle nécessaire.",
      }),
    );
  if (!isDemo) contents.push(link(file.url, "Ouvrir la page du fichier ↗"));
  modal(contents);
}
async function showUsage(file, button) {
  if (usageBusy) return;
  if (isDemo) {
    modal([
      el("p", {
        text: "Les réutilisations de cet exemple fictif ne sont pas calculées. Lancez une recherche réelle pour les consulter.",
      }),
    ]);
    return;
  }
  usageBusy = true;
  busy(true);
  button.disabled = true;
  run = createRun((text) => ($("#status").textContent = text));
  try {
    if (!file.usage) await backend.loadUsage(file, run);
    const list = el("ul", { className: "usage-list" });
    for (const u of file.usage)
      list.append(el("li", {}, link(u.url, `${u.title} (${u.wiki})`)));
    modal([
      el("h3", { text: `${file.usage.length} pages utilisatrices` }),
      el("p", {
        text: "Pages qui incluent ce fichier dans les wikis, tous espaces de noms confondus. Cela ne mesure pas les consultations de l’image.",
      }),
      list,
    ]);
    button.textContent = `${file.usage.length} pages utilisatrices →`;
  } catch (e) {
    modal([el("p", { text: e.message })]);
  } finally {
    run = null;
    usageBusy = false;
    busy(false);
    button.disabled = false;
  }
}
async function showReferences(article, query, button) {
  if (usageBusy) return;
  if (isDemo) {
    modal([
      el("p", {
        text: "Cet article est fictif. Lancez une recherche réelle pour lire ses références.",
      }),
    ]);
    return;
  }
  usageBusy = true;
  busy(true);
  button.disabled = true;
  run = createRun((text) => ($("#status").textContent = text));
  try {
    const check = await backend.inspectArticle(article, query, run);
    const list = el("ul", { className: "usage-list" });
    for (const u of check.referenceUrls) list.append(el("li", {}, link(u, u)));
    modal([
      el("h3", { text: article.title }),
      el("p", {
        text: `${check.referenceNotes} notes de référence contiennent un lien vers ${query.display}. Version ${check.revision}.`,
      }),
      el("p", {
        text: `${check.otherUrls.length} URL correspondantes apparaissent aussi ou seulement hors des notes. Ce contrôle ne juge pas la qualité de la source.`,
      }),
      list,
      link(article.url, "Lire l’article ↗"),
    ]);
  } catch (e) {
    modal([el("p", { text: e.message })]);
  } finally {
    run = null;
    usageBusy = false;
    busy(false);
    button.disabled = false;
  }
}
$("#export").onclick = () => {
  if (!result) return;
  const rows = isCommons
    ? [
        [
          "fichier",
          "classement",
          "lien",
          "emplacement",
          "extrait",
          "revision",
          "erreur",
          "pages_utilisatrices",
          "releve_partiel",
          "date",
        ],
        ...result.files.flatMap((f) =>
          (f.evidence.length ? f.evidence : [{}]).map((e) => [
            f.title,
            labels[f.status],
            e.url || "",
            e.context || "",
            e.excerpt || "",
            f.revision || "",
            f.error || "",
            f.usage?.length ?? "",
            result.truncated,
            result.scannedAt.toISOString(),
          ]),
        ),
      ]
    : [
        [
          "source",
          "wikipedia",
          "article",
          "url",
          "nombre_liens",
          "liens",
          "releve_partiel",
          "date",
        ],
        ...result.summaries.flatMap((s) =>
          s.articles.map((a) => [
            s.query.display,
            a.site.code,
            a.title,
            a.url,
            a.urls.length,
            a.urls.join(" | "),
            Boolean(result.failures.length),
            result.scannedAt.toISOString(),
          ]),
        ),
      ];
  downloadCsv(
    rows,
    `${kind}${isDemo ? "_EXEMPLE_FICTIF" : ""}_${result.scannedAt.toISOString().slice(0, 10)}.csv`,
  );
};
function demo() {
  isDemo = true;
  filter = "all";
  $("#query").value = "bibliotheque.example";
  const query = normalizeQuery("bibliotheque.example", "domain");
  const titles = [
    "Atlas des ports, planche 12",
    "Herbier, étude des fougères",
    "Plan de la ville, édition 1882",
    "Collection de cartes anciennes",
    "Portrait, photographie sur papier",
    "Lettre manuscrite, page 3",
  ];
  if (isCommons) {
    result = {
      query,
      files: titles.map((title, i) => ({
        title: "File:" + title,
        status: [
          "source",
          "source",
          "source",
          "institution",
          "other",
          "unverified",
        ][i],
        evidence:
          i === 5
            ? []
            : [
                {
                  url: `https://bibliotheque.example/notices/${120 + i}`,
                  context: [
                    "source",
                    "source",
                    "source",
                    "institution",
                    "description",
                  ][i],
                  excerpt: "Exemple fictif de lien dans une page de fichier.",
                },
              ],
        revision: null,
      })),
      truncated: false,
      scannedAt: new Date(),
    };
  } else {
    const articles = [
      "Histoire de la cartographie",
      "Bibliothèque numérique",
      "Patrimoine documentaire",
      "Conservation des documents",
    ].map((title, i) => ({
      title,
      site: { code: "fr", url: "https://fr.wikipedia.org" },
      url: "",
      urls: Array.from(
        { length: [4, 3, 2, 1][i] },
        (_, j) => `https://bibliotheque.example/notice/${i}-${j}`,
      ),
    }));
    result = {
      summaries: [{ query, articles, articleCount: 4, linkCount: 10 }],
      articleCount: 4,
      linkCount: 10,
      failures: [],
      scannedAt: new Date(),
    };
  }
  render();
}
$("#demo").onclick = demo;
if (new URLSearchParams(location.search).get("demo") === "1") demo();

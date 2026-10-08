import { t } from "./i18n.js";
export function parseHtml(html, Parser = globalThis.DOMParser) {
  if (!Parser) throw new Error(t("Lecture HTML indisponible."));
  return new Parser().parseFromString(html, "text/html");
}
export function matchingLinks(root, query) {
  return [...root.querySelectorAll("a[href]")].flatMap((a) => {
    try {
      const href = a.getAttribute("href");
      if (!/^(https?:)?\/\//i.test(href)) return [];
      const url = new URL(href, "https://commons.wikimedia.org").href;
      return query.matches(url) ? [{ node: a, url }] : [];
    } catch {
      return [];
    }
  });
}
export function sectionFor(node, doc) {
  let current = null;
  for (const item of doc.querySelectorAll("h1,h2,h3,h4,h5,h6,a[href]")) {
    if (item === node) break;
    if (/^H[1-6]$/.test(item.tagName)) current = item;
  }
  return current;
}
export function normalizedLabel(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[:\s]+$/g, "");
}

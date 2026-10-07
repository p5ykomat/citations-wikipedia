export const numberFormat = new Intl.NumberFormat("fr-FR");

export function normalizeUrl(value) {
  const raw = String(value || "").trim();
  const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const path = (parsed.pathname || "/").replace(/\/+$/, "") || "/";
  return `${parsed.hostname.toLowerCase()}${parsed.port ? `:${parsed.port}` : ""}${path}${parsed.search}`;
}

export function normalizeQuery(value, mode) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Saisissez un domaine ou une URL.");

  if (mode === "domain") {
    let parsed;
    try {
      parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      throw new Error("Saisissez un domaine valide, par exemple bnf.fr.");
    }
    const domain = parsed.hostname
      .toLowerCase()
      .replace(/^\*\./, "")
      .replace(/^www\./, "");
    if (!domain.includes(".") || /\s/.test(domain))
      throw new Error("Saisissez un domaine valide, par exemple bnf.fr.");
    return {
      mode,
      display: domain,
      apiQuery: `*.${domain}`,
      matches(url) {
        try {
          const host = new URL(url).hostname.toLowerCase();
          return host === domain || host.endsWith(`.${domain}`);
        } catch {
          return false;
        }
      },
    };
  }

  let parsed;
  let target;
  try {
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    target = normalizeUrl(raw);
  } catch {
    throw new Error("Saisissez une URL valide.");
  }
  return {
    mode,
    display: target,
    apiQuery: `${parsed.hostname}${parsed.pathname || "/"}${parsed.search}`,
    matches(url) {
      try {
        return normalizeUrl(url) === target;
      } catch {
        return false;
      }
    },
  };
}

export function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function setText(element, value) {
  element.textContent = value;
}

export function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === "className") node.className = value;
    else if (name === "text") node.textContent = value;
    else if (name === "dataset") Object.assign(node.dataset, value);
    else if (name in node && name !== "list") node[name] = value;
    else node.setAttribute(name, String(value));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === undefined || child === null) continue;
    node.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  return node;
}

export function tableContainer(captionText, headers, rows) {
  const table = element("table");
  table.append(element("caption", { text: captionText }));
  const headRow = element("tr");
  headers.forEach((header) =>
    headRow.append(element("th", { scope: "col", text: header })),
  );
  table.append(element("thead", {}, headRow));
  const body = element("tbody");
  rows.forEach((cells) => {
    const row = element("tr");
    cells.forEach((cell) =>
      row.append(cell instanceof Node ? cell : element("td", { text: cell })),
    );
    body.append(row);
  });
  table.append(body);
  return element("div", { className: "table-scroll" }, table);
}

export function csvText(rows) {
  const cell = (value) => {
    const raw = String(value ?? "");
    const text = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[";,\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `\ufeff${rows.map((row) => row.map(cell).join(";")).join("\n")}`;
}

export function downloadCsv(rows, filename) {
  const blob = new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = element("a", { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function filenamePart(value) {
  return (
    String(value || "export")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "export"
  );
}

export function pageUrl(base, title) {
  return `${base}/wiki/${encodeURIComponent(String(title || "").replaceAll(" ", "_"))}`;
}

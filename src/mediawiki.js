const DEFAULT_TIMEOUT = 30000;

export function createRun(statusCallback = () => {}) {
  return {
    aborted: false,
    controllers: new Set(),
    nextAllowedAt: 0,
    status: statusCallback,
    abort() {
      this.aborted = true;
      this.controllers.forEach((controller) => controller.abort());
      this.controllers.clear();
    },
  };
}

function wait(run, milliseconds) {
  return new Promise((resolve, reject) => {
    if (run?.aborted) return reject(new Error("Analyse arrêtée."));
    const end = Date.now() + milliseconds;
    const check = () => {
      if (run?.aborted) return reject(new Error("Analyse arrêtée."));
      const remaining = end - Date.now();
      if (remaining <= 0) return resolve();
      setTimeout(check, Math.min(250, remaining));
    };
    check();
  });
}

function retryDelay(response, attempt) {
  const retryAfter = response?.headers?.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(1000, date - Date.now());
  }
  return Math.min(20000, 1500 * 2 ** attempt);
}

export async function mediaWikiRequest(api, parameters, run, options = {}) {
  const retries = options.retries ?? 3;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const url = new URL(api);
  const params = {
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    errorformat: "plaintext",
    maxlag: "5",
    ...parameters,
  };
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  });

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (run?.aborted) throw new Error("Analyse arrêtée.");
    if (run?.nextAllowedAt > Date.now()) {
      const delay = run.nextAllowedAt - Date.now();
      run.status(`Pause API · reprise dans ${Math.ceil(delay / 1000)} s`);
      await wait(run, delay);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    run?.controllers.add(controller);
    try {
      const contact =
        typeof location === "undefined" ? "local-test" : location.origin;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Api-User-Agent": `citations-wikipedia/0.1 (${contact})`,
        },
      });
      if (response.status === 429 || response.status >= 500) {
        const delay = retryDelay(response, attempt);
        run.nextAllowedAt = Date.now() + delay;
        throw new Error(`RETRY:${response.status}:${delay}`);
      }
      if (run)
        run.nextAllowedAt = Math.max(run.nextAllowedAt, Date.now() + 150);
      if (!response.ok) throw new Error(`Erreur API HTTP ${response.status}.`);
      const data = await response.json();
      if (data.error) {
        if (data.error.code === "maxlag" && attempt < retries) {
          const delay = retryDelay(response, attempt);
          run.nextAllowedAt = Date.now() + delay;
          throw new Error(`RETRY:maxlag:${delay}`);
        }
        throw new Error(
          data.error.info || data.error.code || "Erreur MediaWiki.",
        );
      }
      return data;
    } catch (error) {
      const message = error?.message || "";
      if (run?.aborted) throw new Error("Analyse arrêtée.");
      if (message.startsWith("RETRY:") && attempt < retries) {
        const delay = Number(message.split(":")[2]) || 2000;
        run.status(
          `Serveur occupé · nouvelle tentative dans ${Math.ceil(delay / 1000)} s`,
        );
        await wait(run, delay);
        continue;
      }
      if (error?.name === "AbortError" && attempt < retries) {
        const delay = retryDelay(null, attempt);
        run.status(
          `Délai dépassé · nouvelle tentative dans ${Math.ceil(delay / 1000)} s`,
        );
        await wait(run, delay);
        continue;
      }
      if (message === "Failed to fetch") {
        throw new Error(
          "Impossible de joindre l’API MediaWiki. Vérifiez la connexion puis réessayez.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      run?.controllers.delete(controller);
    }
  }
  throw new Error("Impossible de joindre l’API MediaWiki.");
}

export function continuationParams(data) {
  return data?.continue ? { ...data.continue } : null;
}

export async function getWikipediaSites(run) {
  const data = await mediaWikiRequest(
    "https://meta.wikimedia.org/w/api.php",
    { action: "sitematrix" },
    run,
    { retries: 2 },
  );
  const sites = [];
  const seen = new Set();
  for (const entry of Object.values(data?.sitematrix || {})) {
    for (const site of entry?.site || []) {
      if (!site?.url || site.closed || site.private || site.fishbowl) continue;
      const match = site.url.match(/^https:\/\/([a-z0-9-]+)\.wikipedia\.org$/i);
      if (!match || seen.has(match[1])) continue;
      seen.add(match[1]);
      sites.push({
        code: match[1],
        url: site.url,
        label: `${match[1]}.wikipedia.org`,
      });
    }
  }
  return sites.sort((a, b) => a.code.localeCompare(b.code));
}

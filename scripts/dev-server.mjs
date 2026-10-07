import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = normalize(
  decodeURIComponent(new URL("..", import.meta.url).pathname).replace(
    /^\/(.:)/,
    "$1",
  ),
);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const relative =
      requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    let file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("Chemin refusé");
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types.get(extname(file)) || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Introuvable");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Citations Wikipédia disponible sur http://127.0.0.1:${port}`),
);

# Wiki Link Count

English | [Français](README.fr.md)

Find Wikipedia articles linking to a website, inspect their reference notes, and export results. Counts represent indexed article/URL pairs, not all link occurrences or bibliographic citations. Reference notes are checked separately for each article.

## Use online

[Open Wiki Link Count on Toolforge](https://wiki-link-count.toolforge.org/). No installation required.

## Run locally

Install Node.js 22, download this repository, and run:

```sh
npm ci
npm run dev
```

Open the local address printed in the terminal. No account or API key is required. Requests go directly from your browser to public Wikimedia APIs.

The interface supports English and French. Source titles and excerpts keep their original language.

## Results and limitations

Read the [method and audit notes](docs/AUDIT.md) (French). Results depend on the API index and available page data; they are not an exhaustive historical record.

## Pause and resume

Requests are sequential, with a pause of at least one second after each response and up to 100 links per discovery page. Rate limits trigger bounded retries.

**Pause** preserves progress. **Resume search** continues from the saved checkpoint. The latest results can be restored in the same browser for 24 hours. If browser storage is unavailable, progress remains available while the page stays open. A new search refreshes the data from scratch.

API failures can produce partial results, which remain viewable and exportable with their limitations indicated.

## Development and deployment

```sh
npm test
npm run build
npm start
```

The build is written to `dist/`. Browser code is in `src/`; regression tests are in `tests/`. The HTML test dependency `linkedom` uses the ISC license and is not loaded in the browser.

See the [Toolforge deployment and update guide](docs/TOOLFORGE.md). Updates currently require a build and service restart.

## Credits and licenses

[Mathieu Denel WMFR](https://meta.wikimedia.org/wiki/User:Mathieu_Denel_WMFr) · Personal project.

Code: [MIT](LICENSE). Original documentation and visual content: [CC BY-SA 4.0](LICENSE-DOCS.md), attribution **p5ykomat**. External data retains its own licenses and attribution.


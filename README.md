# PAY//AGENT

Static website for **PAY//AGENT**, an independent concept for policy-controlled x402 payments by
autonomous AI agents: "The policy and observability layer for AI agent payments."

PAY//AGENT is not the official x402 protocol, not a deployed payment network, not financial advice,
and has no token. The site has no wallet connection and moves no funds. Illustrative data is
labelled SIMULATED, EXAMPLE or PROPOSED.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: problem, value, lifecycle, use cases, policy controls, service examples, subscription comparison, calls to action, simulated terminal |
| `whitepaper.html` | Abstract, architecture, lifecycle, policy engine, discovery, threat model, economics, reference implementation, roadmap, limitations, revisions, glossary, official x402 references |
| `docs.html` | Overview, quickstart, proposed client/server flow, example 402 challenge, policy configuration, receipt format, errors, security guidance |
| `playground.html` | In-browser simulation: Request, 402 Challenge, Policy Check, Authorization, Retry, Result |
| `security.html` | Caps, rolling budgets, allowlists, quote expiry, replay, prompt injection, wallet isolation, revocation, escalation, disclosure placeholders |
| `about.html` | Concept status, scope, license, maintainer and contact placeholders |
| `terms.html`, `privacy.html`, `risk.html` | Legal pages |
| `404.html`, `ipfs-404.html` | Custom not-found page (`ipfs-404.html` is the IPFS gateway convention) |

## Layout

```
src/                 authored source (plain HTML, one CSS file, one JS file, no framework)
  assets/site.css    design tokens and every component style
  assets/site.js     nav toggle, terminal replay, playground policy engine (// @ts-check)
dist/                committed production export, served as-is
scripts/build.mjs    zero-dependency build: copies src/ to dist/, adds ipfs-404.html, runs checks
scripts/check.mjs    link/anchor/head-tag checks, engine scenario tests, src/dist byte comparison
DESIGN.md            design system as implemented
artifacts/validation.md  review and verification record
```

Authored internal URLs are relative (`./docs.html`, `./assets/site.css`), so it works at an
IPFS gateway subpath (`/ipfs/<cid>/`), behind an ENS name, or at a domain root. Each page is its own
static HTML file, so no server rewrites or client routing are needed.

The custom 404 resolves its assets and recovery links at runtime against `/ipfs/<cid>/`,
`/ipns/<name>/`, or `/` for domain/subdomain hosting. This supports a gateway serving the fallback
at a nested missing URL. Its `#main` skip link stays on the current document. Direct `file:`
preview uses the containing folder. With JavaScript disabled, relative fallback links work for
direct 404 previews; recovery from nested missing URLs requires returning to the content root
manually, as the page explains.

No runtime dependencies, no web fonts (robust system font stacks), no third-party requests.

## Install

Requires Node 18.17 or newer. There are no package dependencies; `package-lock.json` records an
empty dependency tree.

```sh
npm ci            # installs nothing, verifies the lockfile
```

## Rebuild

```sh
npm run build     # src/ -> dist/, then link and head-tag checks
npm run check     # dist/ checks + playground engine scenarios + src/dist sync
npm run typecheck # tsc --noEmit over src/assets/site.js (fetches typescript@5.9.3 via npx)
```

Edit files in `src/`, never in `dist/`, then run `npm run build` and commit both.

## Preview locally

```sh
npm run preview   # serves dist/ at http://localhost:4173 (fetches http-server@14.1.1 via npx)
```

Any static server works, for example `python3 -m http.server 4173 --directory dist`. Opening
`dist/index.html` directly from disk also works because every link is relative.

## Deploy to IPFS

1. `npm run build`
2. Before a public launch, replace the placeholder origin `https://payagent.example` in the
   `canonical`, `og:url` and `og:image` tags, `robots.txt` and `sitemap.xml` with the real origin.
3. Add the folder as a directory, for example with Kubo: `ipfs add -r --cid-version=1 dist`,
   and pin the root CID with your pinning service of choice (Pinata, web3.storage, a self-hosted
   node, or similar).
4. Open `https://<gateway>/ipfs/<root-cid>/`. Optionally point an ENS name's contenthash or a
   DNSLink TXT record at the CID.

Gateways that support `ipfs-404.html` serve the custom not-found page for missing paths.

## Placeholders to fill

- Deployed origin (`https://payagent.example`) in head tags, `robots.txt`, `sitemap.xml`
- Maintainer, contact and security contact (About, Security, Terms, Privacy, LICENSE)
- `og:image` points to an SVG (`assets/og-image.svg`); some social platforms only unfurl PNG or JPEG,
  so export a 1200x630 raster before launch if previews matter.

## Validation status

Recorded in full in [`artifacts/validation.md`](artifacts/validation.md).

Revision checks actually run:

- `npm run build`: passed; regenerated `dist/` and `dist/ipfs-404.html` from source.
- `npm run check`: passed links, anchors, metadata, deterministic policy scenarios and source/export sync.
- `node test/scratch/typescript/package/lib/tsc.js -p tsconfig.json`: passed with TypeScript 5.9.3,
  the same compiler and configuration as `npm run typecheck`, downloaded directly to scratch.
- `node test/scratch/validate-revision.mjs`: passed the production-script DOM interaction checks
  and HTTP 404 fixture checks described in the validation record. The harness and its standalone
  LinkeDOM 0.18.12 library are temporary verification scaffolding, removed before submission.
- The pinned `taste.mjs` probe was attempted with an explicitly supplied Playwright module;
  it exited 2 before measurement because Chromium exited during launch (`SIGTRAP`). The supplied
  browser tool also could not launch. **No screenshots, visual measurements, native keyboard or
  screen-reader checks are claimed.** Lifecycle grid placement was checked from source, and the
  simulation was exercised in a DOM harness rather than a rendered browser.

The previous round had only source review. These revision results replace its unrun build/check
status; browser verification remains a limitation. No application dependencies were added.

## Ignore file budget

`.gitignore` excludes `node_modules/`, `.npm/`, `.cache/`, `*.tgz` and `test/scratch/`. Path budget for
committed output: the final production export is **150,358 bytes**. A workspace-only audit checked
all deliverable source, assets, configuration and documentation: the submission is under 350,000
bytes, against the 8,388,608-byte limit. Supplied inputs and ignored scratch/cache directories are
excluded. No ignore rules were changed in this revision.

## License

Code: MIT. Whitepaper and documentation text: CC BY 4.0. See `LICENSE`.

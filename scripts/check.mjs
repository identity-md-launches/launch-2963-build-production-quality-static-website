#!/usr/bin/env node
// Zero-dependency checks for the PAY//AGENT export.
//   node scripts/check.mjs            check dist/, engine scenarios, and src/ == dist/
// checkSite(dir) is also used by build.mjs.
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function exists(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

/** Internal links, assets, anchors, required head tags and banned glyphs. */
export async function checkSite(dir) {
  const problems = [];
  const files = await walk(dir);
  const pages = files.filter((f) => f.endsWith(".html"));
  if (!pages.some((f) => relative(dir, f) === "index.html")) problems.push("index.html missing");
  const cache = new Map();
  const read = async (f) => {
    if (!cache.has(f)) cache.set(f, await readFile(f, "utf8"));
    return cache.get(f);
  };

  for (const page of pages) {
    const name = relative(dir, page);
    const html = await read(page);
    const head = html.split("</head>")[0];
    if (!/<title>[^<]{3,}<\/title>/.test(head)) problems.push(`${name}: missing <title>`);
    if (!/<meta name="description" content="[^"]+"/.test(head)) problems.push(`${name}: missing description`);
    if (!/<meta property="og:title" content="[^"]+"/.test(head)) problems.push(`${name}: missing og:title`);
    if (!/<meta property="og:image" content="[^"]+"/.test(head)) problems.push(`${name}: missing og:image`);
    if (!/<link rel="icon"[^>]+href="\.\/favicon\.svg"/.test(head)) problems.push(`${name}: missing favicon link`);
    if (/—/.test(html)) problems.push(`${name}: contains an em dash`);

    const own = ids(html);
    for (const m of html.matchAll(/\s(?:href|src|data-root-href)="([^"]+)"/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|data:)/.test(url)) continue;
      if (url.startsWith("/")) {
        problems.push(`${name}: root-absolute URL ${url} breaks under an IPFS gateway path`);
        continue;
      }
      const [path, frag] = url.split("#");
      if (!path) {
        if (frag && !own.has(frag)) problems.push(`${name}: anchor #${frag} not found`);
        continue;
      }
      const target = resolve(dirname(page), path);
      if (!(await exists(target))) {
        problems.push(`${name}: broken link ${url}`);
        continue;
      }
      if (frag && target.endsWith(".html") && !ids(await read(target)).has(frag)) {
        problems.push(`${name}: anchor ${url} not found`);
      }
    }
  }
  return problems;
}

/** Run the playground's policy engine in a sandbox with a minimal DOM stub. */
export async function checkEngine(file) {
  const code = await readFile(file, "utf8");
  const noop = () => {};
  const document = {
    documentElement: { classList: { add: noop } },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: noop
  };
  const window = { matchMedia: () => ({ matches: true }), setTimeout };
  const ctx = vm.createContext({ window, document, HTMLButtonElement: class {}, HTMLFormElement: class {}, HTMLInputElement: class {}, Set });
  vm.runInContext(code, ctx, { filename: file });
  const sim = window.PayAgentSim;
  const problems = [];
  if (!sim) return ["engine: window.PayAgentSim not exposed"];
  const expected = {
    within: ["allow", []],
    cap: ["deny", ["PA_OVER_REQUEST_CAP"]],
    budget: ["deny", ["PA_OVER_BUDGET"]],
    expired: ["deny", ["PA_QUOTE_EXPIRED"]],
    network: ["deny", ["PA_NETWORK_NOT_ALLOWED"]],
    injection: ["deny", ["PA_PAYEE_NOT_ALLOWED"]],
    replay: ["deny", ["PA_REPLAY_DETECTED"]],
    escalate: ["escalate", []]
  };
  for (const [name, [decision, codes]] of Object.entries(expected)) {
    const sc = sim.PRESETS[name];
    const seed = "nonce-previous-0001";
    const ev = sim.evaluate(sc, new Set([seed]), seed);
    const got = ev.checks.filter((c) => !c.pass).map((c) => c.code);
    if (ev.decision !== decision || got.join() !== codes.join()) {
      problems.push(`engine: preset ${name} gave ${ev.decision} [${got}], expected ${decision} [${codes}]`);
    }
    const again = sim.evaluate(sc, new Set([seed]), seed);
    if (JSON.stringify(again) !== JSON.stringify(ev)) problems.push(`engine: preset ${name} is not deterministic`);
  }
  return problems;
}

/** dist/ must contain exactly what the build would copy from src/. */
export async function checkSync(srcDir, distDir) {
  const problems = [];
  for (const f of await walk(srcDir)) {
    const rel = relative(srcDir, f);
    const twin = join(distDir, rel);
    if (!(await exists(twin))) {
      problems.push(`sync: dist/${rel} missing`);
      continue;
    }
    const [a, b] = await Promise.all([readFile(f), readFile(twin)]);
    if (!a.equals(b)) problems.push(`sync: dist/${rel} differs from src/${rel}`);
  }
  const notFound = join(distDir, "ipfs-404.html");
  if (!(await exists(notFound))) problems.push("sync: dist/ipfs-404.html missing");
  else if (!(await readFile(notFound)).equals(await readFile(join(srcDir, "404.html")))) problems.push("sync: dist/ipfs-404.html differs from src/404.html");
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const dist = join(root, "dist");
  const problems = [
    ...(await checkSite(dist)),
    ...(await checkEngine(join(root, "src/assets/site.js"))),
    ...(await checkSync(join(root, "src"), dist))
  ];
  if (problems.length) {
    console.error(`check: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
  console.log("check: links, anchors, head tags, engine scenarios and src/dist sync all pass");
}

#!/usr/bin/env node
// Zero-dependency production build for the PAY//AGENT static site.
// Copies src/ to dist/, adds ipfs-404.html (the IPFS gateway convention), then runs the link check.
import { cp, rm, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkSite } from "./check.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await cp(src, dist, { recursive: true });
await copyFile(join(dist, "404.html"), join(dist, "ipfs-404.html"));

const problems = await checkSite(dist);
if (problems.length) {
  console.error(`build: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log("build: dist/ written and checked");

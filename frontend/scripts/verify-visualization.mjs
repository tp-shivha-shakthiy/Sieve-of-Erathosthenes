/**
 * Reproducible checks for the visualization module.
 *
 *   npm run verify:viz
 *
 * Bundles the TypeScript sources with the esbuild copy shipped alongside Vite
 * and asserts:
 *   1. the MPI partition logic and the N=30 / 4-process simulation (10 primes)
 *   2. the sieve visualization step model
 *   3. the transport-control state machine (start/pause/resume/next/prev/reset/speed)
 *   4. both views server-render without throwing
 */
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const srcDir = fileURLToPath(new URL("../src", import.meta.url));
const srcFile = (rel) => fileURLToPath(new URL(`../src/${rel}`, import.meta.url));
const util = (name) => srcFile(`utils/${name}`);

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${detail}`}`);
  if (!cond) failures += 1;
}

async function loadModules(entryPoints) {
  const dir = mkdtempSync(join(tmpdir(), "sieve-verify-"));
  const outfile = join(dir, "bundle.cjs");
  await build({
    entryPoints,
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile,
    logLevel: "silent",
  });
  return require(outfile);
}

function primesUpTo(n) {
  const f = Array(n + 1).fill(true);
  f[0] = f[1] = false;
  for (let p = 2; p * p <= n; p += 1) if (f[p]) for (let m = p * p; m <= n; m += p) f[m] = false;
  return f.reduce((acc, v, i) => (v ? acc.concat(i) : acc), []);
}

const { partitionMpiRange, generateMpiSimulation } = await loadModules([util("mpiSimulation.ts")]);
const { generateSieveVizSteps } = await loadModules([util("sieveSimulation.ts")]);
const { stepPlayerReducer, initialPlayerState } = await loadModules([util("useStepPlayer.ts")]);

console.log("\n[1] MPI partition — N=30, 4 processes");
const ranges = partitionMpiRange(30, 4);
check("ranges = (2-9)(10-16)(17-23)(24-30)", JSON.stringify(ranges.map((r) => [r.low, r.high])) === JSON.stringify([[2, 9], [10, 16], [17, 23], [24, 30]]));
const covered = [];
for (const r of ranges) for (let n = r.low; n <= r.high; n += 1) covered.push(n);
check("covers 2..30 exactly once", JSON.stringify(covered) === JSON.stringify([...Array(29)].map((_, i) => i + 2)));

console.log("\n[2] MPI simulation — N=30, 4 processes must yield 10 primes");
const sim = generateMpiSimulation(30, 4);
const final = sim.steps[sim.steps.length - 1];
check("final stage = complete", final.stage === "complete");
check("totalPrimeCount = 10", final.totalPrimeCount === 10, String(final.totalPrimeCount));
check("prime cells = [2,3,5,7,11,13,17,19,23,29]", JSON.stringify(final.cells.filter((c) => c.state === "prime").map((c) => c.num)) === JSON.stringify(primesUpTo(30)));
check("sum of local prime counts = 10", final.ranks.reduce((s, r) => s + r.localPrimeCount, 0) === 10);
check("no cell keeps an animation flag at completion", final.cells.every((c) => !c.justMarked));
const edge = generateMpiSimulation(2, 4);
check("edge case N=2/4P yields 1 prime", edge.steps[edge.steps.length - 1].totalPrimeCount === 1);

console.log("\n[3] Sieve visualization — N=30");
const viz = generateSieveVizSteps(30);
check("10 primes found", viz.primes.length === 10, String(viz.primes.length));
check("primes list matches", JSON.stringify(viz.primes) === JSON.stringify(primesUpTo(30)));
const vfinal = viz.steps[viz.steps.length - 1];
check("starts with all candidates unprocessed", viz.steps[0].cells.every((c) => c.state === "unprocessed"));
check("ends with 10 prime + 19 composite cells", vfinal.cells.filter((c) => c.state === "prime").length === 10 && vfinal.cells.filter((c) => c.state === "composite").length === 19);

console.log("\n[4] Transport controls (state machine)");
let s = initialPlayerState(800);
const send = (a, total = 5) => { s = stepPlayerReducer(s, a, total); return s; };
send({ type: "play" });
check("Start begins playback", s.playing && s.index === 0);
send({ type: "advance" });
check("advance steps to 1", s.index === 1 && s.playing);
send({ type: "pause" });
check("Pause stops playback", !s.playing && s.index === 1);
send({ type: "toggle" });
check("Resume continues", s.playing && s.index === 1);
send({ type: "next" });
send({ type: "next" });
check("Next advances and pauses", s.index === 3 && !s.playing);
send({ type: "prev" });
check("Prev rewinds", s.index === 2);
send({ type: "reset" });
check("Reset returns to start", s.index === 0 && !s.playing);
send({ type: "setSpeed", ms: 160 });
check("Speed updates", s.speed === 160);
send({ type: "play" });
for (let i = 0; i < 12; i += 1) send({ type: "advance" });
check("Auto-advance halts at the last step", s.index === 4 && !s.playing);
send({ type: "play" });
check("Play at end restarts", s.index === 0 && s.playing);

console.log("\n[5] Server-render smoke test");
const entry = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisualisationView } from ${JSON.stringify(util("../../components/VisualisationView.tsx").replace(/\\/g, "/"))};
import { PerformanceView } from ${JSON.stringify(util("../../components/PerformanceView.tsx").replace(/\\/g, "/"))};
export function run() {
  const viz = renderToStaticMarkup(React.createElement(VisualisationView, { keys: null, encryptionResult: null, decryptionResult: null }));
  const perf = renderToStaticMarkup(React.createElement(PerformanceView, {
    response: null,
    system: { cpu_count: 8, architecture: "AMD64", openmp_available: true, compiler: "g++ 9.2.0" },
    onRunMultiThreadBenchmark: async () => {},
    loading: false,
  }));
  return { viz, perf };
}
`;
const dir = mkdtempSync(join(tmpdir(), "sieve-ssr-"));
const outfile = join(dir, "ssr.cjs");
await build({
  stdin: { contents: entry, loader: "ts", resolveDir: srcDir },
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile,
  logLevel: "silent",
  jsx: "automatic",
});
const { viz: vizHtml, perf: perfHtml } = require(outfile).run();
check("VisualisationView renders sieve grid", vizHtml.includes("Sieve of Eratosthenes"));
check("VisualisationView renders MPI lifecycle stage", vizHtml.includes("MPI Distributed Sieve") && vizHtml.includes("Reduce"));
check("VisualisationView renders process panel totals", vizHtml.includes("Reduced prime total"));
check("PerformanceView renders comparison + missing-data dash", perfHtml.includes("Serial vs OpenMP vs MPI") && perfHtml.includes("—"));

console.log(`\n${failures === 0 ? "ALL VISUALIZATION CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);

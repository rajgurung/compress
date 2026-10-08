// Times the real PDF engine on a file at one level. Run one file per process so
// peak memory is per run:
//   /usr/bin/time -l npx tsx scripts/bench-pdf.ts spike/samples/scan-100.pdf balanced
import { readFileSync } from "node:fs";
import { compressPdf } from "../src/engine/pdf";
import type { Level } from "../src/engine/types";
import { nodeGs } from "../tests/helpers/gs";

const [file, level] = process.argv.slice(2) as [string, Level];
const input = readFileSync(file);
const started = performance.now();
const output = await compressPdf(input, level, nodeGs);
console.log(
  JSON.stringify({
    file: file.split("/").pop(),
    level,
    inMB: +(input.length / 1e6).toFixed(1),
    outMB: +(output.length / 1e6).toFixed(2),
    seconds: +((performance.now() - started) / 1000).toFixed(1),
  }),
);

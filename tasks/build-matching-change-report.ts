// `vite-node tasks/build-matching-change-report.ts <before.json> <after.json>`
// diffs two tasks/snapshot-matching.ts outputs into the /demo/matching-changes
// page data.
import fs from "fs";
import path from "path";
import {
	buildMatchingChangeReport,
	type MatchingSnapshot
} from "../src/routes/demo/matching-changes/matchingChangeReport.js";

const OUTPUT_PATH = path.join(
	process.cwd(),
	"src/routes/demo/matching-changes/matchingChangeReport.json"
);

const readSnapshot = (filePath: string): MatchingSnapshot =>
	JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));

const [beforePath, afterPath] = process.argv.slice(2);
const report = buildMatchingChangeReport(
	readSnapshot(beforePath),
	readSnapshot(afterPath)
);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, "\t"));
console.log(
	`${report.cores.length} cores, ${report.clusters.length} clusters → ${path.relative(process.cwd(), OUTPUT_PATH)}`
);

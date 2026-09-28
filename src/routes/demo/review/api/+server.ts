import fs from "fs";
import path from "path";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import type {
	ReviewDecisionRequest,
	ReviewStateResponse,
	ReviewStatusStore,
	ReviewedCorrectionsStore
} from "../reviewTypes.js";

// Dev-only: writes to local files with plain node:fs, which only works when
// a real Node process is serving requests (`npm run dev`). See ../+page.ts.
export const prerender = false;

const STATUS_PATH = path.join(process.cwd(), "src/data/song-review-status.json");
const CORRECTIONS_PATH = path.join(
	process.cwd(),
	"src/data/reviewed-corrections.json"
);
const SPLIT_PATH = path.join(process.cwd(), "src/data/review-split.json");

type SplitStore = { seed: number };

const readJson = <T>(filePath: string, fallback: T): T => {
	if (!fs.existsSync(filePath)) return fallback;
	return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const writeJson = (filePath: string, data: unknown): void => {
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, "\t")}\n`);
};

const loadState = (): ReviewStateResponse => ({
	reviewStatus: readJson<ReviewStatusStore>(STATUS_PATH, {}),
	reviewedCorrections: readJson<ReviewedCorrectionsStore>(CORRECTIONS_PATH, {}),
	splitSeed: readJson<SplitStore>(SPLIT_PATH, { seed: 1 }).seed
});

export const GET: RequestHandler = async () => json(loadState());

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as ReviewDecisionRequest;

	if (body.action === "reshuffle") {
		const split = readJson<SplitStore>(SPLIT_PATH, { seed: 1 });
		split.seed += 1;
		writeJson(SPLIT_PATH, split);
		return json(loadState());
	}

	if (!body.songKey || !body.action || !body.reviewedBy) {
		return json({ error: "songKey, action, and reviewedBy are required" }, { status: 400 });
	}

	const reviewStatus = readJson<ReviewStatusStore>(STATUS_PATH, {});
	const reviewedCorrections = readJson<ReviewedCorrectionsStore>(CORRECTIONS_PATH, {});
	const reviewedAt = new Date().toISOString();

	if (body.action === "verify") {
		reviewStatus[body.songKey] = {
			status: "verified",
			reviewedBy: body.reviewedBy,
			reviewedAt
		};
	} else if (body.action === "flag") {
		reviewStatus[body.songKey] = {
			status: "flagged",
			reviewedBy: body.reviewedBy,
			reviewedAt,
			note: body.note
		};
	} else if (body.action === "correct") {
		reviewStatus[body.songKey] = {
			status: "flagged",
			reviewedBy: body.reviewedBy,
			reviewedAt,
			...(body.note ? { note: body.note } : {})
		};
		reviewedCorrections[body.songKey] = body.correction;
	} else {
		return json({ error: "unknown action" }, { status: 400 });
	}

	writeJson(STATUS_PATH, reviewStatus);
	if (body.action === "correct") writeJson(CORRECTIONS_PATH, reviewedCorrections);

	return json(loadState());
};

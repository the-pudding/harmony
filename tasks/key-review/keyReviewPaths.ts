import path from "path";

const DATA_ROOT = path.join(process.cwd(), "../harmony-data");

export const KEY_REVIEW_LEDGER_PATH = path.join(
	DATA_ROOT,
	"data/key-review.csv"
);
export const KEY_REVIEW_QUEUE_DIR = path.join(
	DATA_ROOT,
	"data/key-review-queue"
);
export const KEY_REVIEW_DECISIONS_DIR = path.join(
	DATA_ROOT,
	"data/key-review-decisions"
);
export const KEY_REVIEW_REPORT_PATH = path.join(
	DATA_ROOT,
	"KEY_REVIEW_REPORT.md"
);

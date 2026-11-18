// A fingerprint of the data hexmap.json is built from, stored in the snapshot
// by tasks/build-hexmap.ts and checked by hexMapSnapshot.test.ts. If any of
// these change (a new or renamed core progression, a song correction, a
// rebuilt songs.json from a different harmony-data), the committed snapshot
// is stale and `npm run hexmap` needs to run. Node-only (build and tests).
//
// Not covered: the matching/layout code itself — see README.
import { createHash } from "crypto";
import coreProgressions from "./core-progressions.js";
import { DEFAULT_WEIGHTS } from "../routes/demo/match-algo-v2/match-algo-v2-logic/weights.js";
import type { SongInput } from "../chord-processing/types.js";

// `correctedInputs` is songs.json after applyHandReviewedCorrections, so the
// hash covers songs.json and both correction files.
export const hexMapInputsHash = (correctedInputs: SongInput[]): string =>
	createHash("sha256")
		.update(JSON.stringify(coreProgressions))
		.update(JSON.stringify(DEFAULT_WEIGHTS))
		.update(JSON.stringify(correctedInputs))
		.digest("hex")
		.slice(0, 16);

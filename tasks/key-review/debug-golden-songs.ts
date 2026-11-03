/**
 * Fast targeted check: for a single parameter set, check only the golden
 * songs (known modulators) to verify they get flagged. Much faster than
 * running the full corpus.
 */
import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import {
	findSectionKeyConflicts,
	PERMISSIVE_VITERBI_PARAMS
} from "./segmentSectionKeys.js";
import type { SongInput } from "../../src/chord-processing/types.js";

const goldenIds = [
	"el-debarge__who-s-johnny-short-circuit-theme",
	"jan-dean__ride-the-wild-surf",
	"sergio-mendes-brasil-66__the-look-of-love",
	"the-diamonds__she-say-oom-dooby-doom",
	"the-honeydrippers__sea-of-love",
	"we-five__you-were-on-my-mind",
	"the-blackbyrds__walking-in-rhythm"
];

const { songs, metaBySongKey } = buildMainDataset();
const { songs: correctedSongs, snapshots, model } = runKeyReview(songs, metaBySongKey);

const goldenSections = correctedSongs.filter((s: SongInput) =>
	goldenIds.some((id) => s.songKey === id)
);
const goldenSnapshots = new Map(
	goldenIds.flatMap((id) => {
		const snap = snapshots.get(id);
		return snap ? [[id, snap] as const] : [];
	})
);

const conflicts = findSectionKeyConflicts(
	model,
	goldenSections,
	goldenSnapshots,
	PERMISSIVE_VITERBI_PARAMS
);

console.log(`Checked ${goldenIds.length} golden songs, found conflicts in ${conflicts.length}:`);
goldenIds.forEach((id) => {
	const c = conflicts.find((x) => x.songKey === id);
	if (c) {
		console.log(`  ✓ ${id}`);
		c.flags.forEach((f) =>
			console.log(`      ${f.kind}(margin=${f.margin.toFixed(3)}) section=${f.sectionId}`)
		);
	} else {
		console.log(`  ✗ MISSED: ${id}`);
	}
});

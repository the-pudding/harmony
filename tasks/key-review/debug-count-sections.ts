import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import { findSectionKeyConflicts, DEFAULT_VITERBI_PARAMS } from "./segmentSectionKeys.js";

const { songs, metaBySongKey } = buildMainDataset();
const { songs: cs, snapshots, model } = runKeyReview(songs, metaBySongKey);

const conflicts = findSectionKeyConflicts(model, cs, snapshots, DEFAULT_VITERBI_PARAMS);
console.log(`DEFAULT params (with independent flags): ${conflicts.length} songs with flags`);

const goldenIds = [
	"el-debarge__who-s-johnny-short-circuit-theme",
	"jan-dean__ride-the-wild-surf",
	"sergio-mendes-brasil-66__the-look-of-love",
	"the-diamonds__she-say-oom-dooby-doom",
	"the-honeydrippers__sea-of-love",
	"we-five__you-were-on-my-mind",
	"the-blackbyrds__walking-in-rhythm"
];

for (const minMax of [0.5, 0.8, 1.0, 1.5, 2.0]) {
	const filtered = conflicts.filter(
		(c) => Math.max(...c.flags.map((f) => f.margin)) >= minMax
	);
	const byKind = filtered
		.flatMap((c) => c.flags)
		.reduce(
			(a, f) => ({ ...a, [f.kind]: (a[f.kind] ?? 0) + 1 }),
			{} as Record<string, number>
		);
	const goldenHit = goldenIds.filter((id) => filtered.some((c) => c.songKey === id));
	console.log(
		`minMaxMargin>=${minMax}: ${filtered.length} songs, golden=${goldenHit.length}/${goldenIds.length}`,
		byKind
	);
}

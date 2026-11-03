import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import {
	findSectionKeyConflicts,
	PERMISSIVE_VITERBI_PARAMS,
	DEFAULT_VITERBI_PARAMS,
	type ViterbiParams
} from "./segmentSectionKeys.js";

const { songs, metaBySongKey } = buildMainDataset();
const { songs: correctedSongs, snapshots, model } = runKeyReview(songs, metaBySongKey);

const goldenIds = [
	"el-debarge__who-s-johnny-short-circuit-theme",
	"jan-dean__ride-the-wild-surf",
	"sergio-mendes-brasil-66__the-look-of-love",
	"the-diamonds__she-say-oom-dooby-doom",
	"the-honeydrippers__sea-of-love",
	"we-five__you-were-on-my-mind",
	"the-blackbyrds__walking-in-rhythm"
];

const testParams: Array<{ label: string } & ViterbiParams> = [
	{ label: "PERMISSIVE margin=0.15", ...PERMISSIVE_VITERBI_PARAMS },
	{ label: "PERMISSIVE margin=0.30", ...PERMISSIVE_VITERBI_PARAMS, minFlagMargin: 0.3 },
	{ label: "DEFAULT  margin=0.15", ...DEFAULT_VITERBI_PARAMS },
	{ label: "DEFAULT  margin=0.50", ...DEFAULT_VITERBI_PARAMS, minFlagMargin: 0.5 },
	{ label: "DEFAULT  margin=0.80", ...DEFAULT_VITERBI_PARAMS, minFlagMargin: 0.8 },
	{ label: "DEFAULT  margin=1.00", ...DEFAULT_VITERBI_PARAMS, minFlagMargin: 1.0 },
	{
		label: "STRICT   mod=-3.5 margin=1.0",
		...DEFAULT_VITERBI_PARAMS,
		modulationPenalty: -3.5,
		relativePenalty: -2.5,
		modePenalty: -1.5,
		minFlagMargin: 1.0
	},
	{
		label: "STRICT   mod=-4.0 margin=1.5",
		...DEFAULT_VITERBI_PARAMS,
		modulationPenalty: -4.0,
		relativePenalty: -3.0,
		modePenalty: -2.0,
		minFlagMargin: 1.5
	}
];

for (const { label, ...vparams } of testParams) {
	const conflicts = findSectionKeyConflicts(model, correctedSongs, snapshots, vparams);
	const goldenHit = goldenIds.filter((id) => conflicts.some((c) => c.songKey === id));
	const byKind = conflicts
		.flatMap((c) => c.flags)
		.reduce(
			(acc, f) => ({ ...acc, [f.kind]: (acc[f.kind] ?? 0) + 1 }),
			{} as Record<string, number>
		);
	console.log(
		`${label}: ${conflicts.length} songs golden=${goldenHit.length}/${goldenIds.length}`,
		byKind
	);
	goldenHit.forEach((id) => {
		const c = conflicts.find((x) => x.songKey === id)!;
		console.log(`  ✓ ${id}: ${c.flags.map((f) => `${f.kind}(${f.margin.toFixed(2)})`).join(", ")}`);
	});
	goldenIds
		.filter((id) => !goldenHit.includes(id))
		.forEach((id) => console.log(`  ✗ MISSED: ${id}`));
}

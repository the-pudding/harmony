/**
 * Calibration script: tunes Viterbi penalties for section-level key detection
 * against HookTheory multi-section songs (used as ground truth).
 *
 * Run: vite-node tasks/key-review/calibrateSectionKeys.ts
 *
 * Output: precision/recall per change kind for a grid of penalty values;
 * recommended constants to paste into segmentSectionKeys.ts.
 */

import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import {
	classifyChange,
	segmentSectionKeys,
	toSectionForSegmentation,
	type SectionChangeKind,
	type SectionKeyFlag,
	type ViterbiParams
} from "./segmentSectionKeys.js";
import { tonalityOf, type Tonality } from "./tonalityModel.js";
import { toPitchClass } from "./pitchClasses.js";
import type { SongInput } from "../../src/chord-processing/types.js";
import { groupSectionsBySongKey } from "./keyReviewPipeline.js";

const HOOKTHEORY_SOURCE = "HT";

// ── calibration harness ──────────────────────────────────────────────────────

type ChangeKindMetrics = {
	tp: number;
	fp: number;
	fn: number;
};

type CalibrationResult = {
	params: ViterbiParams;
	byKind: Record<SectionChangeKind, ChangeKindMetrics>;
	totalFlagged: number;
	totalHTSongsWithChange: number;
};

const tonalityKey = (t: Tonality): string => `${t.tonicPc}|${t.scale}`;

const buildGroundTruth = (
	sections: SongInput[],
	primaryTonality: Tonality
): Map<string, SectionChangeKind> => {
	const result = new Map<string, SectionChangeKind>();
	for (const section of sections) {
		const sectionTonality = {
			tonicPc: toPitchClass(section.key ?? "C"),
			scale: section.scale ?? "major"
		};
		const kind = classifyChange(primaryTonality, sectionTonality);
		if (kind !== null) result.set(section.id, kind);
	}
	return result;
};

const evaluateSong = (
	detected: SectionKeyFlag[],
	groundTruth: Map<string, SectionChangeKind>
): Record<SectionChangeKind, ChangeKindMetrics> => {
	const kinds: SectionChangeKind[] = ["modulation", "relative", "mode"];
	const metrics = Object.fromEntries(
		kinds.map((k) => [k, { tp: 0, fp: 0, fn: 0 }])
	) as Record<SectionChangeKind, ChangeKindMetrics>;

	const detectedSet = new Map(detected.map((f) => [f.sectionId, f.kind]));

	for (const [sectionId, gtKind] of groundTruth) {
		const det = detectedSet.get(sectionId);
		if (det === gtKind) {
			metrics[gtKind].tp++;
		} else {
			metrics[gtKind].fn++;
			if (det !== undefined) metrics[det].fp++;
		}
	}

	for (const [sectionId, detKind] of detectedSet) {
		if (!groundTruth.has(sectionId)) {
			metrics[detKind].fp++;
		}
	}

	return metrics;
};

const calibrate = (
	htSongs: Map<string, SongInput[]>,
	model: ReturnType<typeof runKeyReview>["model"],
	snapshots: ReturnType<typeof runKeyReview>["snapshots"],
	params: ViterbiParams
): CalibrationResult => {
	const aggregate: Record<SectionChangeKind, ChangeKindMetrics> = {
		modulation: { tp: 0, fp: 0, fn: 0 },
		relative: { tp: 0, fp: 0, fn: 0 },
		mode: { tp: 0, fp: 0, fn: 0 }
	};
	let totalFlagged = 0;
	let totalHTSongsWithChange = 0;

	for (const [songKey, sections] of htSongs) {
		const snapshot = snapshots.get(songKey);
		if (!snapshot) continue;

		const primaryTonality = tonalityOf(snapshot.labeledKey, snapshot.labeledScale);
		const groundTruth = buildGroundTruth(sections, primaryTonality);
		if (groundTruth.size === 0) continue;

		totalHTSongsWithChange++;
		const sectionInputs = sections.map((s) =>
			toSectionForSegmentation(s, snapshot.labeledKey, snapshot.labeledScale)
		);
		const { flags } = segmentSectionKeys(model, songKey, sectionInputs, primaryTonality, params);
		const songMetrics = evaluateSong(flags, groundTruth);

		totalFlagged += flags.length;
		for (const kind of ["modulation", "relative", "mode"] as const) {
			aggregate[kind].tp += songMetrics[kind].tp;
			aggregate[kind].fp += songMetrics[kind].fp;
			aggregate[kind].fn += songMetrics[kind].fn;
		}
	}

	return { params, byKind: aggregate, totalFlagged, totalHTSongsWithChange };
};

const formatMetrics = (m: ChangeKindMetrics): string => {
	const prec = m.tp + m.fp > 0 ? m.tp / (m.tp + m.fp) : 0;
	const rec = m.tp + m.fn > 0 ? m.tp / (m.tp + m.fn) : 0;
	const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
	return `P=${prec.toFixed(2)} R=${rec.toFixed(2)} F1=${f1.toFixed(2)} (TP=${m.tp} FP=${m.fp} FN=${m.fn})`;
};

// ── main ──────────────────────────────────────────────────────────────────────

const { songs, metaBySongKey } = buildMainDataset();
const { model, snapshots, songs: correctedSongs } = runKeyReview(songs, metaBySongKey);

const htSongs = new Map(
	[...groupSectionsBySongKey(correctedSongs)].filter(
		([, sections]) => sections[0]?.source === HOOKTHEORY_SOURCE
	)
);

console.log(`HT songs total: ${htSongs.size}`);

const htMultiSection = new Map(
	[...htSongs].filter(([songKey, sections]) => {
		const snapshot = snapshots.get(songKey);
		if (!snapshot) return false;
		const primary = tonalityOf(snapshot.labeledKey, snapshot.labeledScale);
		return sections.some((s) => {
			const t = { tonicPc: toPitchClass(s.key ?? "C"), scale: s.scale ?? "major" };
			return classifyChange(primary, t) !== null;
		});
	})
);
console.log(`HT songs with section key changes: ${htMultiSection.size}`);

const PENALTY_GRID = [-1.0, -1.5, -2.0, -2.5, -3.0];
const RELATIVE_MULTIPLIER = 0.75;
const MODE_MULTIPLIER = 0.4;
const MARGIN_GRID = [0.15, 0.25, 0.35, 0.5];
const PRIOR_GRID = [1.0, 1.5, 2.0];

let bestF1 = 0;
let bestParams: ViterbiParams | null = null;
let bestResult: CalibrationResult | null = null;

for (const mod of PENALTY_GRID) {
	for (const margin of MARGIN_GRID) {
		for (const prior of PRIOR_GRID) {
			const params: ViterbiParams = {
				modulationPenalty: mod,
				relativePenalty: mod * RELATIVE_MULTIPLIER,
				modePenalty: mod * MODE_MULTIPLIER,
				songLabelPriorBonus: prior,
				minFlagMargin: margin
			};
			const result = calibrate(htMultiSection, model, snapshots, params);
			const kinds = ["modulation", "relative", "mode"] as const;
			const avgF1 =
				kinds.reduce((sum, k) => {
					const m = result.byKind[k];
					const p = m.tp + m.fp > 0 ? m.tp / (m.tp + m.fp) : 0;
					const r = m.tp + m.fn > 0 ? m.tp / (m.tp + m.fn) : 0;
					return sum + (p + r > 0 ? (2 * p * r) / (p + r) : 0);
				}, 0) / kinds.length;

			if (avgF1 > bestF1) {
				bestF1 = avgF1;
				bestParams = params;
				bestResult = result;
			}
		}
	}
}

if (!bestParams || !bestResult) {
	console.log("No results.");
	process.exit(1);
}

console.log("\n=== Best parameter set ===");
console.log(`modulationPenalty: ${bestParams.modulationPenalty}`);
console.log(`relativePenalty: ${bestParams.relativePenalty.toFixed(4)}`);
console.log(`modePenalty: ${bestParams.modePenalty.toFixed(4)}`);
console.log(`songLabelPriorBonus: ${bestParams.songLabelPriorBonus}`);
console.log(`minFlagMargin: ${bestParams.minFlagMargin}`);
console.log(`Avg F1: ${bestF1.toFixed(3)}`);
console.log(`Total flagged sections: ${bestResult.totalFlagged}`);

console.log("\n=== Metrics per kind ===");
for (const kind of ["modulation", "relative", "mode"] as const) {
	console.log(`  ${kind}: ${formatMetrics(bestResult.byKind[kind])}`);
}

console.log("\n=== Full grid results (sorted by avg F1) ===");
const allResults: CalibrationResult[] = [];
for (const mod of PENALTY_GRID) {
	for (const margin of MARGIN_GRID) {
		for (const prior of PRIOR_GRID) {
			const params: ViterbiParams = {
				modulationPenalty: mod,
				relativePenalty: mod * RELATIVE_MULTIPLIER,
				modePenalty: mod * MODE_MULTIPLIER,
				songLabelPriorBonus: prior,
				minFlagMargin: margin
			};
			allResults.push(calibrate(htMultiSection, model, snapshots, params));
		}
	}
}
allResults
	.map((r) => {
		const kinds = ["modulation", "relative", "mode"] as const;
		const avgF1 =
			kinds.reduce((sum, k) => {
				const m = r.byKind[k];
				const p = m.tp + m.fp > 0 ? m.tp / (m.tp + m.fp) : 0;
				const re = m.tp + m.fn > 0 ? m.tp / (m.tp + m.fn) : 0;
				return sum + (p + re > 0 ? (2 * p * re) / (p + re) : 0);
			}, 0) / kinds.length;
		return { avgF1, r };
	})
	.sort((a, b) => b.avgF1 - a.avgF1)
	.slice(0, 10)
	.forEach(({ avgF1, r }) => {
		const p = r.params;
		console.log(
			`  mod=${p.modulationPenalty} rel=${p.relativePenalty.toFixed(2)} margin=${p.minFlagMargin} prior=${p.songLabelPriorBonus} → F1=${avgF1.toFixed(3)} flagged=${r.totalFlagged}`
		);
	});

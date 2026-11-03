import { NOTES_PER_OCTAVE, pitchClass } from "../../src/chord-processing/chord-classifier/notes.js";
import { SCALE_INTERVALS } from "../../src/chord-processing/scale-intervals.js";
import type { SongInput } from "../../src/chord-processing/types.js";
import type { SongKeySnapshot } from "./ledger.js";
import { toPitchClass } from "./pitchClasses.js";
import {
	rankTonalities,
	scoreTonality,
	sectionChords,
	tonalityOf,
	type AbsoluteChord,
	type Tonality,
	type TonalityModel
} from "./tonalityModel.js";

// ── pitch-collection helpers ─────────────────────────────────────────────────

const sortedPitchCollection = (tonicPc: number, scale: string): readonly number[] => {
	const intervals = SCALE_INTERVALS[scale] ?? [];
	return [...intervals.map((i) => pitchClass(tonicPc + i))].sort((a, b) => a - b);
};

export const sameCollection = (a: Tonality, b: Tonality): boolean => {
	const ca = sortedPitchCollection(a.tonicPc, a.scale);
	const cb = sortedPitchCollection(b.tonicPc, b.scale);
	return ca.length === cb.length && ca.every((v, i) => v === cb[i]);
};

// ── change-kind classification ───────────────────────────────────────────────

export type SectionChangeKind = "modulation" | "relative" | "mode";

export const classifyChange = (
	from: Tonality,
	to: Tonality
): SectionChangeKind | null => {
	if (from.tonicPc === to.tonicPc && from.scale === to.scale) return null;
	if (from.tonicPc === to.tonicPc) return "mode";
	return sameCollection(from, to) ? "relative" : "modulation";
};

// ── Viterbi constants ────────────────────────────────────────────────────────
// Calibrated against HookTheory multi-section ground truth (calibrateSectionKeys.ts).
// Best avg-F1 = 0.25 at these values (mode: F1=0.35, modulation: F1=0.18, relative: F1=0.21).

export const MODULATION_PENALTY = -2.5;
export const RELATIVE_PENALTY = -1.875;
export const MODE_PENALTY = -1.0;
export const SONG_LABEL_PRIOR_BONUS = 2.0;
export const MIN_SECTION_CHORDS = 3;
export const MIN_FLAG_MARGIN = 0.15;

// ── types ────────────────────────────────────────────────────────────────────

export type ViterbiParams = {
	modulationPenalty: number;
	relativePenalty: number;
	modePenalty: number;
	songLabelPriorBonus: number;
	minFlagMargin: number;
};

export const DEFAULT_VITERBI_PARAMS: ViterbiParams = {
	modulationPenalty: MODULATION_PENALTY,
	relativePenalty: RELATIVE_PENALTY,
	modePenalty: MODE_PENALTY,
	songLabelPriorBonus: SONG_LABEL_PRIOR_BONUS,
	minFlagMargin: MIN_FLAG_MARGIN
};

// A more aggressive variant for the section queue — favours recall over precision.
// Reviewer filters out false positives.
export const PERMISSIVE_VITERBI_PARAMS: ViterbiParams = {
	modulationPenalty: -1.5,
	relativePenalty: -1.0,
	modePenalty: -0.5,
	songLabelPriorBonus: 1.5,
	minFlagMargin: 0.15
};

// Independent per-section margin above which a section is ALWAYS flagged
// regardless of whether Viterbi decoded it to a different state. This catches
// clear solo-section modulations that Viterbi conservatively leaves unlabelled.
export const MIN_INDEPENDENT_FLAG_MARGIN = 1.5;

export type SectionForSegmentation = {
	id: string;
	labeledTonality: Tonality;
	chords: AbsoluteChord[];
};

export type SectionKeyFlag = {
	sectionId: string;
	labeled: Tonality;
	suggested: Tonality;
	kind: SectionChangeKind;
	margin: number;
};

export type SongSectionAssessment = {
	songKey: string;
	flags: SectionKeyFlag[];
};

// ── helpers ──────────────────────────────────────────────────────────────────

const allStates = (model: TonalityModel): Tonality[] =>
	Array.from({ length: NOTES_PER_OCTAVE }, (_, tonicPc) =>
		model.modes.map((scale) => ({ tonicPc, scale }))
	).flat();

const transitionScore = (from: Tonality, to: Tonality, params: ViterbiParams): number => {
	const kind = classifyChange(from, to);
	if (kind === null) return 0;
	if (kind === "mode") return params.modePenalty;
	if (kind === "relative") return params.relativePenalty;
	return params.modulationPenalty;
};

// ── Viterbi decode ───────────────────────────────────────────────────────────

const decodeViterbi = (
	model: TonalityModel,
	sections: SectionForSegmentation[],
	songLabeledTonality: Tonality,
	params: ViterbiParams
): Tonality[] => {
	if (sections.length === 0) return [];

	const states = allStates(model);
	const S = states.length;
	const N = sections.length;

	const firstEmissions = states.map((state) =>
		scoreTonality(model, [sections[0].chords], state)
	);

	const initialScores = states.map((state, si) => {
		const prior =
			classifyChange(songLabeledTonality, state) === null
				? params.songLabelPriorBonus
				: 0;
		return firstEmissions[si] + prior;
	});

	const dp: number[][] = [initialScores];
	const backtrack: number[][] = [];

	for (let i = 1; i < N; i++) {
		const prevDp = dp[i - 1];
		const emissions = states.map((state) =>
			scoreTonality(model, [sections[i].chords], state)
		);
		const dpRow = new Array<number>(S);
		const backRow = new Array<number>(S);

		for (let j = 0; j < S; j++) {
			let bestScore = -Infinity;
			let bestPrev = 0;
			for (let k = 0; k < S; k++) {
				const score = prevDp[k] + transitionScore(states[k], states[j], params);
				if (score > bestScore) {
					bestScore = score;
					bestPrev = k;
				}
			}
			dpRow[j] = bestScore + emissions[j];
			backRow[j] = bestPrev;
		}

		dp.push(dpRow);
		backtrack.push(backRow);
	}

	const path = new Array<number>(N);
	const lastDp = dp[N - 1];
	path[N - 1] = lastDp.indexOf(Math.max(...lastDp));
	for (let i = N - 2; i >= 0; i--) {
		path[i] = backtrack[i][path[i + 1]];
	}

	return path.map((si) => states[si]);
};

// ── public API ───────────────────────────────────────────────────────────────

export const toSectionForSegmentation = (
	section: SongInput,
	fallbackKey: string,
	fallbackScale: string
): SectionForSegmentation => ({
	id: section.id,
	labeledTonality: {
		tonicPc: toPitchClass(section.key ?? fallbackKey),
		scale: section.scale ?? fallbackScale
	},
	chords: sectionChords(section)
});

const independentFlag = (
	model: TonalityModel,
	section: SectionForSegmentation
): SectionKeyFlag | null => {
	// Skip sections whose labeled mode is outside the model's common modes.
	// For those, scoreTonality returns -∞ and every common-mode alternative
	// trivially "wins" — these are song-level mode issues, not section changes.
	if (!model.modes.includes(section.labeledTonality.scale)) return null;

	const ranked = rankTonalities(model, [section.chords]);
	const [best] = ranked;
	const kind = classifyChange(section.labeledTonality, best);
	if (kind === null) return null;

	const labeledScore = scoreTonality(model, [section.chords], section.labeledTonality);
	const margin = best.score - labeledScore;
	if (!Number.isFinite(margin) || margin < MIN_INDEPENDENT_FLAG_MARGIN) return null;

	return { sectionId: section.id, labeled: section.labeledTonality, suggested: best, kind, margin };
};

export const segmentSectionKeys = (
	model: TonalityModel,
	songKey: string,
	sections: SectionForSegmentation[],
	songLabeledTonality: Tonality,
	params: ViterbiParams = DEFAULT_VITERBI_PARAMS
): SongSectionAssessment => {
	const qualifying = sections.filter((s) => s.chords.length >= MIN_SECTION_CHORDS);
	if (qualifying.length === 0) return { songKey, flags: [] };

	const decoded = decodeViterbi(model, qualifying, songLabeledTonality, params);

	const viterbiFlags = new Map<string, SectionKeyFlag>();

	for (let i = 0; i < qualifying.length; i++) {
		const section = qualifying[i];
		const suggested = decoded[i];
		const kind = classifyChange(section.labeledTonality, suggested);
		if (kind === null) continue;

		// For sections with uncommon labeled modes, the score comparison is not
		// meaningful (labeled score = -∞). Skip Viterbi flag too.
		if (!model.modes.includes(section.labeledTonality.scale)) continue;

		const labeledScore = scoreTonality(model, [section.chords], section.labeledTonality);
		const suggestedScore = scoreTonality(model, [section.chords], suggested);
		const margin = suggestedScore - labeledScore;

		if (Number.isFinite(margin) && margin >= params.minFlagMargin) {
			viterbiFlags.set(section.id, { sectionId: section.id, labeled: section.labeledTonality, suggested, kind, margin });
		}
	}

	// Independent per-section check: catch clear modulations missed by Viterbi
	const flags = [...viterbiFlags.values()];
	for (const section of qualifying) {
		if (viterbiFlags.has(section.id)) continue;
		const flag = independentFlag(model, section);
		if (flag) flags.push(flag);
	}

	return { songKey, flags };
};

export const findSectionKeyConflicts = (
	model: TonalityModel,
	songs: SongInput[],
	snapshots: Map<string, SongKeySnapshot>,
	params?: ViterbiParams
): SongSectionAssessment[] => {
	const bySong = new Map<string, SongInput[]>();
	for (const section of songs) {
		const songKey = section.songKey ?? section.id;
		bySong.set(songKey, [...(bySong.get(songKey) ?? []), section]);
	}

	return [...bySong.entries()].flatMap(([songKey, sections]) => {
		const snapshot = snapshots.get(songKey);
		if (!snapshot) return [];

		const songLabeledTonality = tonalityOf(snapshot.labeledKey, snapshot.labeledScale);
		const sectionInputs = sections.map((s) =>
			toSectionForSegmentation(s, snapshot.labeledKey, snapshot.labeledScale)
		);
		const assessment = segmentSectionKeys(
			model,
			songKey,
			sectionInputs,
			songLabeledTonality,
			params
		);
		return assessment.flags.length > 0 ? [assessment] : [];
	});
};

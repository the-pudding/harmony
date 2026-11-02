import {
	outOfKeyShare,
	rankTonalities,
	scoreTonality,
	type AbsoluteChord,
	type ScoredTonality,
	type Tonality,
	type TonalityModel
} from "./tonalityModel.js";

export const FLAG_REASONS = {
	betterFit: "better-fit",
	uncommonMode: "uncommon-mode",
	outOfKey: "out-of-key",
	capoShift: "capo-shift"
} as const;

export type FlagReason = (typeof FLAG_REASONS)[keyof typeof FLAG_REASONS];

export const MISLABEL_MARGIN = 0.5;
export const MAX_OUT_OF_KEY_SHARE = 0.35;
export const MAX_TYPICAL_CAPO_FRET = 4;
export const CANDIDATES_TO_REPORT = 3;

export type KeyAssessment = {
	labeled: Tonality;
	labeledScore: number;
	candidates: ScoredTonality[];
	margin: number;
	outOfKeyShare: number;
	reasons: FlagReason[];
};

const sameTonality = (a: Tonality, b: Tonality): boolean =>
	a.tonicPc === b.tonicPc && a.scale === b.scale;

export const assessSongKey = (
	model: TonalityModel,
	sections: AbsoluteChord[][],
	labeled: Tonality,
	capo: number
): KeyAssessment => {
	const ranked = rankTonalities(model, sections);
	const [best] = ranked;
	const labeledScore = scoreTonality(model, sections, labeled);
	const margin = sameTonality(best, labeled) ? 0 : best.score - labeledScore;
	const labeledOutOfKeyShare = outOfKeyShare(sections, labeled);

	const reasons: FlagReason[] = [
		...(model.modes.includes(labeled.scale) ? [] : [FLAG_REASONS.uncommonMode]),
		...(margin > MISLABEL_MARGIN ? [FLAG_REASONS.betterFit] : []),
		...(labeledOutOfKeyShare > MAX_OUT_OF_KEY_SHARE
			? [FLAG_REASONS.outOfKey]
			: []),
		...(capo > MAX_TYPICAL_CAPO_FRET ? [FLAG_REASONS.capoShift] : [])
	];

	return {
		labeled,
		labeledScore,
		candidates: ranked.slice(0, CANDIDATES_TO_REPORT),
		margin,
		outOfKeyShare: labeledOutOfKeyShare,
		reasons
	};
};

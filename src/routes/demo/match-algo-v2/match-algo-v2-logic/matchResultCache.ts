import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	buildFinalChordAnnotations,
	selectFinalProgressions
} from "../../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
import {
	applySubsetFlag,
	findStrictSubsetKeys
} from "../../define-chord-progression/progression-matching-logic/strictSubsetProgressions.js";
import type {
	ChordAnnotation,
	ProgressionWithMatchStats
} from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import { matchSongV2, type SectionMatchResult } from "./matchSongV2.js";
import type { MatchWeights } from "./weights.js";

export type AlgoMatchResult = {
	explainedPercent: number;
	matches: ProgressionWithMatchStats[];
	annotations: ChordAnnotation[];
	sectionResults: SectionMatchResult[];
};

const v1Cache = new Map<string, AlgoMatchResult>();
const v2Cache = new Map<string, AlgoMatchResult>();

const WEIGHT_KEY_SEPARATOR = ",";

export const weightsCacheKey = (weights: MatchWeights): string =>
	[
		weights.core,
		weights.length,
		weights.sectionStart,
		weights.sectionEnd,
		weights.contiguousRepeat
	].join(WEIGHT_KEY_SEPARATOR);

export const v2ResultCacheKey = (
	songKey: string,
	weights: MatchWeights
): string => `${songKey}|${weightsCacheKey(weights)}`;

export const computeV1MatchResult = (
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): AlgoMatchResult => {
	const selection = selectFinalProgressions(song, coreProgressions);
	const subsetKeys = findStrictSubsetKeys([
		...selection.coreMatches,
		...selection.gapCandidates
	]);
	const coreSelected = applySubsetFlag(selection.coreSelected, subsetKeys);
	const gapSelected = applySubsetFlag(selection.gapSelected, subsetKeys);
	return {
		explainedPercent: selection.explainedPercent,
		matches: [...coreSelected, ...gapSelected],
		annotations: buildFinalChordAnnotations(song, {
			coreSelected,
			gapSelected
		}),
		sectionResults: []
	};
};

export const computeV2MatchResult = (
	song: GroupedSong,
	coreProgressions: CoreProgression[],
	weights: MatchWeights
): AlgoMatchResult => {
	const result = matchSongV2(song, coreProgressions, weights);
	return {
		explainedPercent: result.explainedPercent,
		matches: result.matches,
		annotations: result.annotations,
		sectionResults: result.sectionResults
	};
};

export const getCachedV1MatchResult = (
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): AlgoMatchResult => {
	const cached = v1Cache.get(song.songKey);
	if (cached) return cached;
	const computed = computeV1MatchResult(song, coreProgressions);
	v1Cache.set(song.songKey, computed);
	return computed;
};

export const getCachedV2MatchResult = (
	song: GroupedSong,
	coreProgressions: CoreProgression[],
	weights: MatchWeights
): AlgoMatchResult => {
	const key = v2ResultCacheKey(song.songKey, weights);
	const cached = v2Cache.get(key);
	if (cached) return cached;
	const computed = computeV2MatchResult(song, coreProgressions, weights);
	v2Cache.set(key, computed);
	return computed;
};

export const hasCachedV1MatchResult = (songKey: string): boolean =>
	v1Cache.has(songKey);

export const hasCachedV2MatchResult = (
	songKey: string,
	weights: MatchWeights
): boolean => v2Cache.has(v2ResultCacheKey(songKey, weights));

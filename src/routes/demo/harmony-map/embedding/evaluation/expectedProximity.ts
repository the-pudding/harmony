import type { Coords } from "../reducers/types.js";
import type { SongProgressionCounts } from "../vectors/progressionVocabulary.js";

type ProgressionPair = readonly [string, string];

// Pairs of progressions that harmonic intuition says should be near each other.
// The score measures whether songs using prog1 land close to songs using prog2.
const EXPECTED_NEAR_PAIRS: readonly ProgressionPair[] = [
	["ii-V-I", "vi-ii-V-I"],
	["I-V-vi-IV", "vi-IV-I-V"],
	["I-IV-V", "I-V-IV"],
	["i-VII-VI-VII", "i-VI-III-VII"],
	["ii-V-I", "I-vi-ii-V"]
] as const;

const euclidean2D = (a: Coords, b: Coords): number =>
	Math.hypot(a.x - b.x, a.y - b.y);

const meanGroupDistance = (
	groupA: readonly Coords[],
	groupB: readonly Coords[]
): number | null => {
	if (groupA.length === 0 || groupB.length === 0) return null;
	const distances = groupA.flatMap((a) => groupB.map((b) => euclidean2D(a, b)));
	return distances.reduce((s, d) => s + d, 0) / distances.length;
};

const sortedPairwiseDistances = (coords: readonly Coords[]): number[] => {
	const distances: number[] = [];
	for (let i = 0; i < coords.length; i++) {
		for (let j = i + 1; j < coords.length; j++) {
			distances.push(euclidean2D(coords[i]!, coords[j]!));
		}
	}
	return distances.sort((a, b) => a - b);
};

export type ProximityScore = {
	pair: ProgressionPair;
	meanDistance: number | null;
	// Fraction of all pairwise distances that exceed the inter-group mean.
	// Higher = the pair is closer together than typical song pairs.
	percentile: number | null;
};

export const computeExpectedProximity = (
	coordsByKey: Map<string, Coords>,
	songs: readonly SongProgressionCounts[]
): ProximityScore[] => {
	const allCoords = [...coordsByKey.values()];
	const baseline = sortedPairwiseDistances(allCoords);

	const songKeysByProgression = new Map<string, string[]>();
	for (const song of songs) {
		for (const { chordProgression } of song.progressionCounts) {
			const existing = songKeysByProgression.get(chordProgression) ?? [];
			songKeysByProgression.set(chordProgression, [...existing, song.songKey]);
		}
	}

	const resolveGroup = (prog: string): Coords[] =>
		(songKeysByProgression.get(prog) ?? [])
			.map((key) => coordsByKey.get(key))
			.filter((c): c is Coords => c !== undefined);

	return EXPECTED_NEAR_PAIRS.map((pair) => {
		const groupA = resolveGroup(pair[0]);
		const groupB = resolveGroup(pair[1]);
		const meanDistance = meanGroupDistance(groupA, groupB);
		const percentile =
			meanDistance === null
				? null
				: baseline.filter((d) => d > meanDistance).length / baseline.length;
		return { pair, meanDistance, percentile };
	});
};

export const meanProximityScore = (scores: readonly ProximityScore[]): number => {
	const valid = scores.filter((s) => s.percentile !== null);
	if (valid.length === 0) return 0;
	return valid.reduce((sum, s) => sum + (s.percentile ?? 0), 0) / valid.length;
};

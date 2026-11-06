import type { BlendWeights } from "./constants.js";
import { computeFeatureAxes } from "./featureAxes.js";
import { groupShareVectorForSong } from "./progressionGroups.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";
import type { SongVectorSet } from "./songVectors.js";

const l2Normalize = (values: number[]): number[] => {
	const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
	return norm === 0 ? values : values.map((v) => v / norm);
};

// Produces a row in the blended matrix for one song.
// Each block is L2-normalized independently before being scaled by its weight.
// This preserves the property that cosine on the concatenated vector is a
// weighted average of per-block cosine similarities (weights proportional to
// weight²), so setting one weight to 1 and the rest to 0 is equivalent to
// using only that block — identical to the corresponding single-method UMAP.
const blendedRow = (
	song: SongProgressionCounts,
	identityVectors: SongVectorSet,
	contentVectors: SongVectorSet,
	weights: BlendWeights
): number[] => {
	const identity = l2Normalize(
		identityVectors.vectorBySongKey.get(song.songKey)?.weighted ?? []
	);
	const content = l2Normalize(
		contentVectors.vectorBySongKey.get(song.songKey)?.weighted ?? []
	);
	const groupShare = l2Normalize(groupShareVectorForSong(song.progressionCounts));
	const { x, y } = computeFeatureAxes(song);
	const axes = l2Normalize([x, y]);

	return [
		...identity.map((v) => v * weights.identity),
		...content.map((v) => v * weights.content),
		...groupShare.map((v) => v * weights.groupShare),
		...axes.map((v) => v * weights.axes)
	];
};

export const buildBlendedMatrix = (
	songs: readonly SongProgressionCounts[],
	identityVectors: SongVectorSet,
	contentVectors: SongVectorSet,
	weights: BlendWeights
): { matrix: number[][]; songKeys: string[] } => ({
	matrix: songs.map((song) =>
		blendedRow(song, identityVectors, contentVectors, weights)
	),
	songKeys: songs.map((s) => s.songKey)
});

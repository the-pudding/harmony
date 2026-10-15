// The layout HexMap shows: plain "umap" over progression vectors, with the
// settings HexMap has always used. tasks/build-hexmap.ts bakes it into
// static/data/hexmap.json; createEmbeddingState computes the same thing live
// for the demos (method "umap", these options, this minDist).
import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import {
	buildProgressionVocabulary,
	buildSongVectors,
	DEFAULT_SONG_VECTOR_OPTIONS,
	toMatrix,
	type SongVectorOptions
} from "./vectors/index.js";
// Not ./reducers/index.js: that pulls in the browser-only reduce worker.
import { runUmap, UMAP_COMPONENT_COUNT_2D } from "./reducers/umap.js";
import type { Coords } from "./reducers/types.js";

export const HEX_MAP_VECTOR_OPTIONS: SongVectorOptions = {
	...DEFAULT_SONG_VECTOR_OPTIONS,
	weighting: "chords",
	useTfIdf: false,
	l2Normalize: true,
	weightChorus: false
};

export const HEX_MAP_UMAP_MIN_DIST = 0.05;

export const computeHexMapLayout = (
	coverages: readonly SongCoverageEntry[]
): Map<string, Coords> => {
	const vectorSet = buildSongVectors(
		coverages,
		buildProgressionVocabulary(coverages),
		HEX_MAP_VECTOR_OPTIONS
	);
	const reduction = runUmap(
		toMatrix(vectorSet.vectors),
		UMAP_COMPONENT_COUNT_2D,
		{ minDist: HEX_MAP_UMAP_MIN_DIST }
	);
	return new Map(
		vectorSet.vectors.map((vector, index) => [
			vector.songKey,
			reduction.coords[index] ?? { x: 0, y: 0 }
		])
	);
};

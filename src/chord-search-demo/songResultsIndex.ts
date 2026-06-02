import {
	buildSectionsBySongKey,
	prepareSong
} from "../chord-processing/match-chord-progressions/index.js";
import { resolveSongKey } from "../chord-processing/songIdentity.js";
import type { PreparedSong, SongInput } from "../chord-processing/types.js";
import { splitIndexIntoChunks } from "./chartSongIndex.js";

export type SongResultsWorkerEntry = {
	id: string;
	songKey: string;
	titleLower: string;
	artists: string[];
	year?: number;
	suffixes: string[];
	deltas: number[];
	bassIntervals: (number | null)[];
	wrapDelta: number;
};

export type SongResultsCorpusState = {
	workerIndex: SongResultsWorkerEntry[];
	sectionsBySongKey: Map<string, PreparedSong[]>;
};

export const buildSongResultsWorkerEntry = (
	prepared: PreparedSong
): SongResultsWorkerEntry => ({
	id: prepared.id ?? prepared.title,
	songKey: resolveSongKey(prepared),
	titleLower: prepared.title.toLowerCase(),
	artists: prepared.artists,
	...(prepared.year !== undefined ? { year: prepared.year } : {}),
	suffixes: prepared.abstractProgression.suffixes,
	deltas: prepared.abstractProgression.deltas,
	bassIntervals: prepared.abstractProgression.bassIntervals,
	wrapDelta: prepared.abstractProgression.wrapDelta
});

export const buildSongResultsCorpusState = (songs: SongInput[]): SongResultsCorpusState => {
	const preparedSongs = songs.map((song, index) => prepareSong(song, index));
	const workerIndex = preparedSongs.map(buildSongResultsWorkerEntry);

	return {
		workerIndex,
		sectionsBySongKey: buildSectionsBySongKey(preparedSongs)
	};
};

export const splitSongResultsIndexIntoChunks = (
	index: SongResultsWorkerEntry[],
	chunkCount: number
): SongResultsWorkerEntry[][] => splitIndexIntoChunks(index, chunkCount);

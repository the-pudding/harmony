import type { SongInput } from "../chord-processing/types.js";

export type ChartSongIndexEntry = {
	id: string;
	songKey: string;
	title: string;
	artists: string[];
	year?: number;
	romanTokens: string[];
	suffixes: string[];
	deltas: number[];
	bassIntervals: (number | null)[];
	wrapDelta: number;
};

const songKeyFromId = (id: string | undefined): string => {
	if (!id) return "unknown";
	const parts = id.split("__");
	return parts.length >= 2 ? `${parts[0]}__${parts[1]}` : id;
};

export const buildChartSongIndex = (songs: SongInput[]): ChartSongIndexEntry[] =>
	songs.flatMap((song, index) => {
		if (
			!song.romanTokens?.length ||
			!song.suffixes ||
			!song.deltas ||
			!song.bassIntervals ||
			song.wrapDelta === undefined
		) {
			return [];
		}

		return [
			{
				id: song.id ?? `chart-index-${index}`,
				songKey: song.songKey ?? songKeyFromId(song.id),
				title: song.title,
				artists: song.artists,
				...(song.year !== undefined ? { year: song.year } : {}),
				romanTokens: song.romanTokens,
				suffixes: song.suffixes,
				deltas: song.deltas,
				bassIntervals: song.bassIntervals,
				wrapDelta: song.wrapDelta
			}
		];
	});

export const splitIndexIntoChunks = <T>(
	index: T[],
	chunkCount: number
): T[][] => {
	if (index.length === 0 || chunkCount <= 1) return [index];

	const chunks: T[][] = Array.from({ length: chunkCount }, () => []);
	const chunkSize = Math.ceil(index.length / chunkCount);

	index.forEach((entry, entryIndex) => {
		const chunkIndex = Math.min(
			Math.floor(entryIndex / chunkSize),
			chunkCount - 1
		);
		chunks[chunkIndex].push(entry);
	});

	return chunks.filter((chunk) => chunk.length > 0);
};

export const splitChartSongIndexIntoChunks = (
	index: ChartSongIndexEntry[],
	chunkCount: number
): ChartSongIndexEntry[][] => splitIndexIntoChunks(index, chunkCount);

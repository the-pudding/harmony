import type { AllSongsCoverageResult } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

const MIN_POTENTIAL_CORE_SONG_PERCENT = 0.5;
const TOP_FEATURED_SONGS_LIMIT = 5;

export type PotentialCoreProgressionSong = {
	songKey: string;
	title: string;
	coveragePercent: number;
};

export type PotentialCoreProgressionRow = {
	chordProgression: string;
	songCount: number;
	songPercent: number;
	coveragePercents: number[];
	topSongs: PotentialCoreProgressionSong[];
};

export const buildPotentialCoreProgressions = (
	result: AllSongsCoverageResult
): PotentialCoreProgressionRow[] => {
	const totalSongs = result.songCoverages.length;
	if (totalSongs === 0) return [];

	type Accumulator = {
		songCount: number;
		songs: PotentialCoreProgressionSong[];
		coveragePercents: number[];
	};

	const byProgression = result.songCoverages.reduce(
		(acc, song) => {
			song.progressionCounts.forEach(({ chordProgression, coveragePercent, isCore }) => {
				if (isCore) return;
				const existing = acc.get(chordProgression);
				const entry: PotentialCoreProgressionSong = {
					songKey: song.songKey,
					title: song.title,
					coveragePercent
				};
				if (existing) {
					acc.set(chordProgression, {
						songCount: existing.songCount + 1,
						songs: [...existing.songs, entry],
						coveragePercents: [...existing.coveragePercents, coveragePercent]
					});
				} else {
					acc.set(chordProgression, {
						songCount: 1,
						songs: [entry],
						coveragePercents: [coveragePercent]
					});
				}
			});
			return acc;
		},
		new Map<string, Accumulator>()
	);

	const minSongCount = (MIN_POTENTIAL_CORE_SONG_PERCENT / 100) * totalSongs;

	return [...byProgression.entries()]
		.filter(([, { songCount }]) => songCount >= minSongCount)
		.map(([chordProgression, { songCount, songs, coveragePercents }]) => ({
			chordProgression,
			songCount,
			songPercent: (songCount / totalSongs) * 100,
			coveragePercents,
			topSongs: [...songs]
				.sort((a, b) => b.coveragePercent - a.coveragePercent)
				.slice(0, TOP_FEATURED_SONGS_LIMIT)
		}))
		.sort((a, b) => b.songPercent - a.songPercent);
};

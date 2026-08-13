import { colorForProgressionGroupName } from "$data/core-progressions.js";
import {
	coreProgressionNameByChordProgression,
	dominantProgressionGroupName,
	progressionGroupNameByChordProgression
} from "$data/core-progressions.util.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";

const PERCENT_MULTIPLIER = 100;

export type ArtistSongStat = {
	songKey: string;
	title: string;
	artists: string[];
	year: number | null;
	coveragePercent: number;
	matchingProgressions: string[];
	coreProgressions: string[];
	groupName: string | null;
};

export type ArtistProgressionStat = {
	chordProgression: string;
	name: string;
	groupName: string | null;
	color: string;
	songCount: number;
	sharePercent: number;
};

export type ArtistGroupStat = {
	groupName: string;
	color: string;
	songCount: number;
	sharePercent: number;
};

export type ArtistSummary = {
	artistName: string;
	songs: ArtistSongStat[];
	songCount: number;
	coreMatchedSongCount: number;
	coreMatchedPercent: number;
	averageCoveragePercent: number;
	firstYear: number | null;
	lastYear: number | null;
	topProgressions: ArtistProgressionStat[];
	groupStats: ArtistGroupStat[];
	dominantGroupName: string | null;
};

export type YearDomain = { min: number; max: number };

const countByKey = (keys: readonly string[]): Map<string, number> =>
	keys.reduce(
		(counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1),
		new Map<string, number>()
	);

const averageOf = (values: readonly number[]): number =>
	values.length === 0
		? 0
		: values.reduce((total, value) => total + value, 0) / values.length;

const definedYears = (songs: readonly ArtistSongStat[]): number[] =>
	songs.flatMap((song) => (song.year === null ? [] : [song.year]));

export const toSongStat = (
	entry: SongCoverageEntry,
	songByKey: ReadonlyMap<string, GroupedSong>
): ArtistSongStat => ({
	songKey: entry.songKey,
	title: entry.title,
	artists: entry.artists,
	year: songByKey.get(entry.songKey)?.year ?? null,
	coveragePercent: entry.coveragePercent,
	matchingProgressions: entry.matchingProgressions,
	coreProgressions: entry.matchingProgressions.filter((chordProgression) =>
		progressionGroupNameByChordProgression.has(chordProgression)
	),
	groupName: dominantProgressionGroupName(entry.progressionCounts)
});

const progressionStatsFor = (
	songs: readonly ArtistSongStat[]
): ArtistProgressionStat[] => {
	const counts = countByKey(songs.flatMap((song) => song.coreProgressions));
	return [...counts.entries()]
		.map(([chordProgression, songCount]): ArtistProgressionStat => {
			const groupName =
				progressionGroupNameByChordProgression.get(chordProgression) ?? null;
			return {
				chordProgression,
				name:
					coreProgressionNameByChordProgression.get(chordProgression) ??
					chordProgression,
				groupName,
				color: colorForProgressionGroupName(groupName),
				songCount,
				sharePercent: (songCount / songs.length) * PERCENT_MULTIPLIER
			};
		})
		.sort(
			(first, second) =>
				second.songCount - first.songCount ||
				first.chordProgression.localeCompare(second.chordProgression)
		);
};

const groupStatsFor = (songs: readonly ArtistSongStat[]): ArtistGroupStat[] => {
	const counts = countByKey(
		songs.flatMap((song) => (song.groupName === null ? [] : [song.groupName]))
	);
	return [...counts.entries()]
		.map(
			([groupName, songCount]): ArtistGroupStat => ({
				groupName,
				color: colorForProgressionGroupName(groupName),
				songCount,
				sharePercent: (songCount / songs.length) * PERCENT_MULTIPLIER
			})
		)
		.sort(
			(first, second) =>
				second.songCount - first.songCount ||
				first.groupName.localeCompare(second.groupName)
		);
};

const summarizeArtist = (
	artistName: string,
	songs: readonly ArtistSongStat[]
): ArtistSummary => {
	const years = definedYears(songs);
	const coreMatchedSongCount = songs.filter(
		(song) => song.coreProgressions.length > 0
	).length;
	const groupStats = groupStatsFor(songs);
	return {
		artistName,
		songs: [...songs].sort(
			(first, second) =>
				(first.year ?? Infinity) - (second.year ?? Infinity) ||
				first.title.localeCompare(second.title)
		),
		songCount: songs.length,
		coreMatchedSongCount,
		coreMatchedPercent:
			songs.length === 0
				? 0
				: (coreMatchedSongCount / songs.length) * PERCENT_MULTIPLIER,
		averageCoveragePercent: averageOf(
			songs.map((song) => song.coveragePercent)
		),
		firstYear: years.length > 0 ? Math.min(...years) : null,
		lastYear: years.length > 0 ? Math.max(...years) : null,
		topProgressions: progressionStatsFor(songs),
		groupStats,
		dominantGroupName: groupStats[0]?.groupName ?? null
	};
};

export const buildArtistSummaries = (
	entries: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>
): ArtistSummary[] => {
	const songsByArtist = entries
		.flatMap((entry) => {
			const stat = toSongStat(entry, songByKey);
			return entry.artists.map((artistName) => ({ artistName, stat }));
		})
		.reduce(
			(byArtist, { artistName, stat }) =>
				byArtist.set(artistName, [...(byArtist.get(artistName) ?? []), stat]),
			new Map<string, ArtistSongStat[]>()
		);

	return [...songsByArtist.entries()]
		.map(([artistName, songs]) => summarizeArtist(artistName, songs))
		.sort(
			(first, second) =>
				second.songCount - first.songCount ||
				first.artistName.localeCompare(second.artistName)
		);
};

export const searchArtistSummaries = (
	summaries: readonly ArtistSummary[],
	query: string,
	limit: number
): ArtistSummary[] => {
	const needle = query.trim().toLowerCase();
	if (needle === "") return [];
	return summaries
		.filter((summary) => summary.artistName.toLowerCase().includes(needle))
		.slice(0, limit);
};

export const yearDomainFor = (
	summaries: readonly ArtistSummary[]
): YearDomain | null => {
	const years = summaries.flatMap((summary) => definedYears(summary.songs));
	return years.length === 0
		? null
		: { min: Math.min(...years), max: Math.max(...years) };
};

import type { ScaleName } from "../../../chord-processing/scales.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import coreProgressions from "$data/core-progressions.js";
import { canonicalChordProgressionByName } from "$data/core-progressions.util.js";

export const DEFAULT_TOP_PROGRESSIONS_LIMIT = 25;

export type TopProgressionRow = {
	name: string;
	chordProgression: string;
	scale: ScaleName;
	description: string | null;
	avgCoveragePercent: number;
	songCount: number;
	songSharePercent: number;
};

// Keyed by canonical core-progression name — see decadeSignatures.ts's same
// map for why (rotation-proof identity vs. literal per-song spelling).
const progressionByName = new Map(coreProgressions.map((p) => [p.name, p]));

// Ranks core progressions by average per-song density — for every song
// (whether it matches or not), how much of that song's chords this
// progression's occurrences cover, averaged across the whole corpus. This
// rewards a progression that's both widespread AND a substantial chunk of
// the songs it's in, unlike a raw occurrence count (which lets one
// heavily-repeated song dominate) or plain song presence (which treats a
// single passing instance the same as a song built almost entirely on it).
export const computeTopProgressions = (
	songCoverages: readonly SongCoverageEntry[],
	limit: number = DEFAULT_TOP_PROGRESSIONS_LIMIT
): TopProgressionRow[] => {
	const totalSongs = songCoverages.length;
	if (totalSongs === 0) return [];

	const sumCoveragePercentByName = new Map<string, number>();
	const songCountByName = new Map<string, number>();

	for (const entry of songCoverages) {
		const seenInThisSong = new Set<string>();
		for (const p of entry.progressionCounts) {
			if (!p.isCore) continue;
			sumCoveragePercentByName.set(
				p.name,
				(sumCoveragePercentByName.get(p.name) ?? 0) + p.coveragePercent
			);
			if (!seenInThisSong.has(p.name)) {
				seenInThisSong.add(p.name);
				songCountByName.set(p.name, (songCountByName.get(p.name) ?? 0) + 1);
			}
		}
	}

	return [...sumCoveragePercentByName.entries()]
		.map(([name, sum]): TopProgressionRow => {
			const registered = progressionByName.get(name);
			const songCount = songCountByName.get(name) ?? 0;
			return {
				name,
				chordProgression: canonicalChordProgressionByName.get(name) ?? name,
				scale: registered?.scale ?? "major",
				description: registered?.description ?? null,
				avgCoveragePercent: sum / totalSongs,
				songCount,
				songSharePercent: (songCount / totalSongs) * 100
			};
		})
		.sort((a, b) => b.avgCoveragePercent - a.avgCoveragePercent)
		.slice(0, limit);
};

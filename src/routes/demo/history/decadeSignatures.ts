import type { ScaleName } from "../../../chord-processing/scales.js";
import type { GroupedSong } from "../../../data/songBrowser.js";
import { toCalendarYear } from "../../../data/songYear.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import coreProgressions from "$data/core-progressions.js";
import { canonicalChordProgressionByName } from "$data/core-progressions.util.js";

export const decadeOf = (year: number): number =>
	Math.floor(toCalendarYear(year) / 10) * 10;

// A three-chord shape can turn up almost anywhere by chance, so require a
// real sample size before calling a progression "signature" of a decade.
const MIN_DECADE_TOTAL_MATCHES = 20;
const MIN_PROGRESSION_DECADE_COUNT = 15;
export const TOP_SIGNATURES_PER_DECADE = 3;
const EMBLEMATIC_SONGS_PER_PROGRESSION = 2;

export type EmblematicSong = {
	songKey: string;
	title: string;
	artists: string[];
	year: number;
	matchCount: number;
	chorusMatchCount: number;
	coveragePercent: number;
};

export type DecadeSignature = {
	chordProgression: string;
	scale: ScaleName;
	name: string;
	description: string | null;
	count: number;
	shareInDecade: number;
	distinctiveness: number;
	emblematicSongs: EmblematicSong[];
};

export type DecadeHistory = {
	decade: number;
	songCount: number;
	totalCoreMatches: number;
	signatures: DecadeSignature[];
};

// Keyed by canonical core-progression name — the rotation-proof identity
// (see SongProgressionCount.name). Matching is tonic-rotation-invariant, so
// the same named progression can appear under different literal roman-
// numeral spellings depending on which chord a song's own key calls "I"
// (e.g. Sweet Home Alabama reads as V-IV-I in its own key, the same shape
// as "sweet home mixolydian"'s authored I-bVII-IV). Aggregating by name
// instead of literal spelling is what makes these decade totals correct.
const progressionByName = new Map(coreProgressions.map((p) => [p.name, p]));

export const computeDecadeHistory = (
	songCoverages: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>
): DecadeHistory[] => {
	const totalsByDecade = new Map<number, Map<string, number>>();
	const totalsOverall = new Map<string, number>();
	const songsByDecadeAndName = new Map<string, EmblematicSong[]>();
	const songKeysByDecade = new Map<number, Set<string>>();

	for (const entry of songCoverages) {
		const song = songByKey.get(entry.songKey);
		if (!song || song.year === undefined) continue;
		const decade = decadeOf(song.year);

		if (!songKeysByDecade.has(decade)) songKeysByDecade.set(decade, new Set());
		songKeysByDecade.get(decade)!.add(song.songKey);

		if (!totalsByDecade.has(decade)) totalsByDecade.set(decade, new Map());
		const decadeMap = totalsByDecade.get(decade)!;

		for (const p of entry.progressionCounts) {
			if (!p.isCore) continue;
			const name = p.name;
			decadeMap.set(name, (decadeMap.get(name) ?? 0) + p.matchCount);
			totalsOverall.set(name, (totalsOverall.get(name) ?? 0) + p.matchCount);

			const songListKey = `${decade}|${name}`;
			const list = songsByDecadeAndName.get(songListKey) ?? [];
			list.push({
				songKey: song.songKey,
				title: song.title,
				artists: song.artists,
				year: song.year,
				matchCount: p.matchCount,
				chorusMatchCount: p.chorusMatchCount,
				coveragePercent: p.coveragePercent
			});
			songsByDecadeAndName.set(songListKey, list);
		}
	}

	const grandTotal = [...totalsOverall.values()].reduce((s, n) => s + n, 0);
	if (grandTotal === 0) return [];

	const decades = [...totalsByDecade.keys()].sort((a, b) => a - b);

	return decades.flatMap((decade): DecadeHistory[] => {
		const decadeMap = totalsByDecade.get(decade)!;
		const decadeTotal = [...decadeMap.values()].reduce((s, n) => s + n, 0);
		if (decadeTotal < MIN_DECADE_TOTAL_MATCHES) return [];

		const signatures = [...decadeMap.entries()]
			.filter(([, count]) => count >= MIN_PROGRESSION_DECADE_COUNT)
			.map(([name, count]): DecadeSignature => {
				const registered = progressionByName.get(name);
				const shareInDecade = count / decadeTotal;
				const shareOverall = (totalsOverall.get(name) ?? 0) / grandTotal;
				const distinctiveness = shareInDecade / shareOverall;
				const emblematicSongs = (
					songsByDecadeAndName.get(`${decade}|${name}`) ?? []
				)
					.sort(
						(a, b) =>
							b.chorusMatchCount - a.chorusMatchCount ||
							b.coveragePercent - a.coveragePercent ||
							b.matchCount - a.matchCount
					)
					.slice(0, EMBLEMATIC_SONGS_PER_PROGRESSION);
				return {
					chordProgression: canonicalChordProgressionByName.get(name) ?? name,
					scale: registered?.scale ?? "major",
					name,
					description: registered?.description ?? null,
					count,
					shareInDecade,
					distinctiveness,
					emblematicSongs
				};
			})
			.sort((a, b) => b.distinctiveness - a.distinctiveness)
			.slice(0, TOP_SIGNATURES_PER_DECADE);

		return [
			{
				decade,
				songCount: songKeysByDecade.get(decade)?.size ?? 0,
				totalCoreMatches: decadeTotal,
				signatures
			}
		];
	});
};

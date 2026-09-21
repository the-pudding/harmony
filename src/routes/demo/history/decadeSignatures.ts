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
// MIN_PROGRESSION_DECADE_COUNT is deliberately much stricter than the bare
// minimum needed to be statistically present: at 15, small decades (the
// 2020s has under 800 total core matches, vs. thousands for most others)
// threw up distinctiveness ratios above 10x on as few as 17-30 matches —
// more small-sample noise than real signature. 50 was the floor that
// separated that noise from genuine, well-supported signatures (e.g.
// "jazz doo wop" in the 1950s at 64 matches, still a real 6-7x signature).
const MIN_DECADE_TOTAL_MATCHES = 20;
const MIN_PROGRESSION_DECADE_COUNT = 50;
export const TOP_SIGNATURES_PER_DECADE = 3;
// A wider cut for the volume-vs-distinctiveness quadrant chart, which is
// meant to show more of the field than just the top 3 cards — enough to see
// where the also-rans sit relative to the real signatures, without listing
// every eligible progression.
export const QUADRANT_SIGNATURES_PER_DECADE = 10;
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
	// Sort/identity key. For the combined 1950s-60s row (see
	// COMBINED_EARLY_DECADES below) this is 1955 — a placeholder that sorts
	// between the two real decades and never collides with a real decade
	// value, not a claim that 1955 is meaningful on its own.
	decade: number;
	decadeLabel: string;
	songCount: number;
	totalCoreMatches: number;
	signatures: DecadeSignature[];
	// Same ranking, cut wider (see QUADRANT_SIGNATURES_PER_DECADE) — always
	// starts with the same progressions as `signatures`, just more of them.
	topSignatures: DecadeSignature[];
};

// The corpus's data only starts partway through 1958, so the standalone
// "1950s" row is thin on its own — this adds one extra combined row (in
// addition to, not instead of, the normal 1950s and 1960s rows) pooling both
// decades for every calculation, the same treatment used ad hoc elsewhere
// for this exact reason.
const COMBINED_EARLY_DECADES = [1950, 1960];
const COMBINED_EARLY_DECADES_KEY = 1955;
const COMBINED_EARLY_DECADES_LABEL = "1950s-60s";

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

	const emblematicSongsFor = (
		decadesToInclude: readonly number[],
		name: string
	): EmblematicSong[] =>
		decadesToInclude
			.flatMap((d) => songsByDecadeAndName.get(`${d}|${name}`) ?? [])
			.sort(
				(a, b) =>
					b.chorusMatchCount - a.chorusMatchCount ||
					b.coveragePercent - a.coveragePercent ||
					b.matchCount - a.matchCount
			)
			.slice(0, EMBLEMATIC_SONGS_PER_PROGRESSION);

	// Builds one row — a real decade (decadesToInclude = [that decade]) or a
	// pooled combination of several — from the same per-progression counts
	// gathered above, so every row uses identical math.
	const buildDecadeHistory = (
		sortKey: number,
		label: string,
		decadesToInclude: readonly number[]
	): DecadeHistory | null => {
		const mergedCounts = new Map<string, number>();
		const mergedSongKeys = new Set<string>();
		for (const d of decadesToInclude) {
			for (const [name, count] of totalsByDecade.get(d) ?? []) {
				mergedCounts.set(name, (mergedCounts.get(name) ?? 0) + count);
			}
			for (const key of songKeysByDecade.get(d) ?? []) mergedSongKeys.add(key);
		}

		const decadeTotal = [...mergedCounts.values()].reduce((s, n) => s + n, 0);
		if (decadeTotal < MIN_DECADE_TOTAL_MATCHES) return null;

		const rankedSignatures = [...mergedCounts.entries()]
			.filter(([, count]) => count >= MIN_PROGRESSION_DECADE_COUNT)
			.map(([name, count]): DecadeSignature => {
				const registered = progressionByName.get(name);
				const shareInDecade = count / decadeTotal;
				const shareOverall = (totalsOverall.get(name) ?? 0) / grandTotal;
				const distinctiveness = shareInDecade / shareOverall;
				return {
					chordProgression: canonicalChordProgressionByName.get(name) ?? name,
					scale: registered?.scale ?? "major",
					name,
					description: registered?.description ?? null,
					count,
					shareInDecade,
					distinctiveness,
					emblematicSongs: emblematicSongsFor(decadesToInclude, name)
				};
			})
			.sort((a, b) => b.distinctiveness - a.distinctiveness);

		return {
			decade: sortKey,
			decadeLabel: label,
			songCount: mergedSongKeys.size,
			totalCoreMatches: decadeTotal,
			signatures: rankedSignatures.slice(0, TOP_SIGNATURES_PER_DECADE),
			topSignatures: rankedSignatures.slice(0, QUADRANT_SIGNATURES_PER_DECADE)
		};
	};

	const decades = [...totalsByDecade.keys()].sort((a, b) => a - b);
	const normalEntries = decades.flatMap((decade) => {
		const entry = buildDecadeHistory(decade, `${decade}s`, [decade]);
		return entry ? [entry] : [];
	});

	const combinedEntry = buildDecadeHistory(
		COMBINED_EARLY_DECADES_KEY,
		COMBINED_EARLY_DECADES_LABEL,
		COMBINED_EARLY_DECADES
	);

	const allEntries = combinedEntry ? [...normalEntries, combinedEntry] : normalEntries;
	return allEntries.sort((a, b) => a.decade - b.decade);
};

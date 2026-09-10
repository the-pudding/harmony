import type { GroupedSong } from "../../../data/songBrowser.js";
import { parseRomanToken } from "../../../chord-processing/romanNumerals.js";
import { decadeOf } from "./decadeSignatures.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

// A three-chord shape can turn up almost anywhere by chance — require a
// real sample size before charting a decade's cadence mix.
const MIN_DECADE_UNIT_COUNT = 20;

export type CadenceType = "perfect" | "plagal" | "other-resolving" | "non-resolving";

const isUnalteredTonic = (token: string): boolean => {
	const parsed = parseRomanToken(token);
	return !!parsed && parsed.degree === 1 && !parsed.flat && !parsed.sharp;
};

// Perfect (authentic) cadence: unaltered V/v resolving to the tonic.
// Plagal cadence: unaltered IV/iv resolving to the tonic ("amen" cadence).
// Both require landing on a genuine, unaltered tonic — not a borrowed chord.
export const classifyCadence = (tokens: readonly string[]): CadenceType | null => {
	if (tokens.length < 2) return null;
	const last = tokens[tokens.length - 1];
	if (!isUnalteredTonic(last)) return "non-resolving";

	const prev = parseRomanToken(tokens[tokens.length - 2]);
	if (prev && prev.degree === 5 && !prev.flat && !prev.sharp) return "perfect";
	if (prev && prev.degree === 4 && !prev.flat && !prev.sharp) return "plagal";
	return "other-resolving";
};

type CadenceCounts = {
	perfect: number;
	plagal: number;
	other: number;
	nonResolving: number;
};

const emptyCadenceCounts = (): CadenceCounts => ({
	perfect: 0,
	plagal: 0,
	other: 0,
	nonResolving: 0
});

const addCadenceOutcome = (counts: CadenceCounts, cadence: CadenceType): void => {
	if (cadence === "perfect") counts.perfect++;
	else if (cadence === "plagal") counts.plagal++;
	else if (cadence === "other-resolving") counts.other++;
	else counts.nonResolving++;
};

type CadencePercentages = {
	perfectPercent: number;
	plagalPercent: number;
	otherResolvingPercent: number;
	nonResolvingPercent: number;
	resolvingCount: number;
	perfectShareOfResolving: number;
	plagalShareOfResolving: number;
	otherShareOfResolving: number;
};

const percentagesFromCounts = (
	counts: CadenceCounts,
	totalCount: number
): CadencePercentages => {
	const resolvingCount = counts.perfect + counts.plagal + counts.other;
	return {
		perfectPercent: (counts.perfect / totalCount) * 100,
		plagalPercent: (counts.plagal / totalCount) * 100,
		otherResolvingPercent: (counts.other / totalCount) * 100,
		nonResolvingPercent: (counts.nonResolving / totalCount) * 100,
		resolvingCount,
		perfectShareOfResolving:
			resolvingCount > 0 ? (counts.perfect / resolvingCount) * 100 : 0,
		plagalShareOfResolving:
			resolvingCount > 0 ? (counts.plagal / resolvingCount) * 100 : 0,
		otherShareOfResolving:
			resolvingCount > 0 ? (counts.other / resolvingCount) * 100 : 0
	};
};

// -- Section endings: how each verse/chorus/bridge/etc. section ends -------

export type CadenceDecadeRow = CadencePercentages & {
	decade: number;
	sectionCount: number;
};

export const computeCadenceHistory = (
	songs: readonly GroupedSong[]
): CadenceDecadeRow[] => {
	const countsByDecade = new Map<number, CadenceCounts>();

	for (const song of songs) {
		if (song.year === undefined) continue;
		const decade = decadeOf(song.year);
		if (!countsByDecade.has(decade)) countsByDecade.set(decade, emptyCadenceCounts());
		const counts = countsByDecade.get(decade)!;

		for (const section of song.sections) {
			const cadence = classifyCadence(section.romanTokens);
			if (cadence === null) continue;
			addCadenceOutcome(counts, cadence);
		}
	}

	return [...countsByDecade.entries()]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, counts]): CadenceDecadeRow[] => {
			const sectionCount =
				counts.perfect + counts.plagal + counts.other + counts.nonResolving;
			if (sectionCount < MIN_DECADE_UNIT_COUNT) return [];
			return [{ decade, sectionCount, ...percentagesFromCounts(counts, sectionCount) }];
		});
};

// -- Progression endings: how each distinct matched chord progression ends -

// Counts each distinct progression once per song, regardless of how many
// times it repeats within that song (matching progressionVocabulary.ts's
// "document frequency, not occurrence count" convention) — a song that
// loops one 4-chord shape 12 times shouldn't outweigh a song that states
// its progression twice. Prevalence still comes through naturally: a
// progression common across many songs gets one instance per song that
// uses it. Includes every progression the matcher finds, core-named or
// not — cadence is a property of the actual shape a song played, not just
// the ones that happen to be catalogued in core-progressions.ts.
//
// Cadence is classified from the literal spelling that song matched, not
// a progression's canonical/registered spelling — matching is tonic-
// rotation-invariant, so the same named progression can read as ending on
// the tonic in one song's key and not in another's (e.g. "sweet home
// mixolydian" is registered as I-bVII-IV, which never resolves, but a
// rotated rendition reading as V-IV-I in a different song's own key ends
// in a genuine plagal cadence there).
export type ProgressionCadenceDecadeRow = CadencePercentages & {
	decade: number;
	progressionInstanceCount: number;
};

export const computeProgressionCadenceHistory = (
	songCoverages: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>
): ProgressionCadenceDecadeRow[] => {
	const countsByDecade = new Map<number, CadenceCounts>();

	for (const entry of songCoverages) {
		const song = songByKey.get(entry.songKey);
		if (!song || song.year === undefined) continue;
		const decade = decadeOf(song.year);
		if (!countsByDecade.has(decade)) countsByDecade.set(decade, emptyCadenceCounts());
		const counts = countsByDecade.get(decade)!;

		for (const progression of entry.progressionCounts) {
			const cadence = classifyCadence(progression.chordProgression.split("-"));
			if (cadence === null) continue;
			addCadenceOutcome(counts, cadence);
		}
	}

	return [...countsByDecade.entries()]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, counts]): ProgressionCadenceDecadeRow[] => {
			const progressionInstanceCount =
				counts.perfect + counts.plagal + counts.other + counts.nonResolving;
			if (progressionInstanceCount < MIN_DECADE_UNIT_COUNT) return [];
			return [
				{
					decade,
					progressionInstanceCount,
					...percentagesFromCounts(counts, progressionInstanceCount)
				}
			];
		});
};

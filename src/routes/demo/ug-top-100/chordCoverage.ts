import type { GroupedSong } from "../../../data/songBrowser.js";
import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";

const PERCENT_SCALE = 100;
const PITCH_CLASSES = 12;

// Guitarists rarely capo past here — tone gets thin and open strings run out
// of usable fretboard. 0 always stays in range, so "no capo" is always an
// option alongside every capo position.
const MAX_CAPO_FRET = 7;

export type ChordCoverageStep = {
	chordCount: number;
	chord: string;
	newlyCoveredSongCount: number;
	cumulativeCoveredSongCount: number;
	cumulativeCoveredPercent: number;
};

export type ChordCoverageAnalysis = {
	totalSongCount: number;
	totalDistinctChordCount: number;
	steps: ChordCoverageStep[];
	chordsForThreshold: number;
	thresholdPercent: number;
	allowCapo: boolean;
};

export type ChordCoverageOptions = {
	thresholdPercent?: number;
	allowCapo?: boolean;
};

type RequiredChord = { rootPitchClass: number; suffix: string };

// Every distinct root+quality chord (bass-note inversions collapsed into
// their base chord — a slash chord isn't a new shape to learn) a song's
// sections actually sound, deduped.
const requiredChordsForSong = (song: GroupedSong): RequiredChord[] => {
	const seen = new Map<string, RequiredChord>();
	for (const section of song.sections) {
		for (const chord of section.parsedProgression) {
			const key = `${chord.rootPitchClass}:${chord.suffix}`;
			if (!seen.has(key)) {
				seen.set(key, { rootPitchClass: chord.rootPitchClass, suffix: chord.suffix });
			}
		}
	}
	return [...seen.values()];
};

// A capo on fret f raises whatever shape you play by f semitones, so a chord
// that SOUNDS at a given pitch class can be played with the shape f
// semitones lower. Each song gets one shape-set per capo fret 0..MAX_CAPO_FRET
// (fret 0 = the literal, no-capo chords); the song is playable if the known
// set fully contains at least one of these variants — one capo position per
// song, chosen freely to whatever helps most.
const shapeSetVariantsForSong = (
	requiredChords: readonly RequiredChord[],
	allowCapo: boolean
): ReadonlySet<string>[] => {
	const frets = allowCapo ? Array.from({ length: MAX_CAPO_FRET + 1 }, (_, i) => i) : [0];
	return frets.map(
		(fret) =>
			new Set(
				requiredChords.map((chord) =>
					formatChordName({
						rootPitchClass: (chord.rootPitchClass - fret + PITCH_CLASSES) % PITCH_CLASSES,
						suffix: chord.suffix
					})
				)
			)
	);
};

const isSongPlayable = (
	variants: readonly ReadonlySet<string>[],
	known: ReadonlySet<string>,
	candidate: string | null
): boolean =>
	variants.some((variant) =>
		[...variant].every((shape) => known.has(shape) || shape === candidate)
	);

// Greedy set cover: at each step, learn whichever not-yet-known chord shape
// unlocks the most additional fully-playable songs (ties broken by how many
// songs could use that shape at all, then name). True optimal is NP-hard;
// greedy is the standard near-optimal heuristic and gives an honest "what to
// learn next" order.
export const analyzeChordCoverage = (
	songs: readonly GroupedSong[],
	options: ChordCoverageOptions = {}
): ChordCoverageAnalysis => {
	const { thresholdPercent = 90, allowCapo = false } = options;

	const variantsBySong = songs.map((song) =>
		shapeSetVariantsForSong(requiredChordsForSong(song), allowCapo)
	);
	const totalSongCount = variantsBySong.length;

	const candidatePool = new Map<string, number>();
	for (const variants of variantsBySong) {
		const shapesInAnyVariant = new Set<string>();
		for (const variant of variants) for (const shape of variant) shapesInAnyVariant.add(shape);
		for (const shape of shapesInAnyVariant) {
			candidatePool.set(shape, (candidatePool.get(shape) ?? 0) + 1);
		}
	}

	const known = new Set<string>();
	const remaining = new Set(variantsBySong.map((_, index) => index));

	const steps: ChordCoverageStep[] = [];
	let cumulativeCoveredSongCount = 0;

	while (known.size < candidatePool.size) {
		let bestChord: string | null = null;
		let bestGain = -1;

		for (const chord of candidatePool.keys()) {
			if (known.has(chord)) continue;
			let gain = 0;
			for (const index of remaining) {
				if (isSongPlayable(variantsBySong[index], known, chord)) gain++;
			}
			const isBetter =
				gain > bestGain ||
				(gain === bestGain &&
					bestChord !== null &&
					(candidatePool.get(chord) ?? 0) > (candidatePool.get(bestChord) ?? 0));
			if (isBetter) {
				bestGain = gain;
				bestChord = chord;
			}
		}

		if (bestChord === null) break;
		known.add(bestChord);

		const newlyCoveredIndices = [...remaining].filter((index) =>
			isSongPlayable(variantsBySong[index], known, null)
		);
		for (const index of newlyCoveredIndices) remaining.delete(index);
		cumulativeCoveredSongCount += newlyCoveredIndices.length;

		steps.push({
			chordCount: known.size,
			chord: bestChord,
			newlyCoveredSongCount: newlyCoveredIndices.length,
			cumulativeCoveredSongCount,
			cumulativeCoveredPercent: (cumulativeCoveredSongCount / totalSongCount) * PERCENT_SCALE
		});
	}

	const thresholdStep = steps.find(
		(step) => step.cumulativeCoveredPercent >= thresholdPercent
	);

	return {
		totalSongCount,
		totalDistinctChordCount: candidatePool.size,
		steps,
		chordsForThreshold: thresholdStep?.chordCount ?? steps[steps.length - 1]?.chordCount ?? 0,
		thresholdPercent,
		allowCapo
	};
};

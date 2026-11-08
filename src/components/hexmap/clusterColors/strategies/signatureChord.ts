import type { KeyTonality } from "$routes/demo/design/chord-viz/diatonicChords.js";
import {
	chordColor,
	normalizeRoman,
	type ChordColorOptions
} from "../chordColors.js";
import { mixOklab } from "../oklab.js";
import {
	progressionChordsByName,
	type ProgressionChords
} from "../progressionChords.js";
import type { ClusterColorStrategy } from "../types.js";

// For clusters whose progressions have no chord the palette can color.
export const SIGNATURE_FALLBACK_COLOR = "#a1a1aa";

const TONIC: Record<KeyTonality, string> = { major: "I", minor: "i" };

const chordKey = (tonality: KeyTonality, roman: string) =>
	`${tonality}.${roman}`;

const normalizedChords = ({ tonality, chords }: ProgressionChords) =>
	chords.map((chord) => normalizeRoman(chord, tonality));

// The progression's most telling chord other than the tonic, scored like
// TF-IDF: how often it plays in this progression times how rare it is
// across all the map's progressions. Falls back to the tonic for a
// progression with no other chord the palette colors.
export const signatureChordOf = (
	progression: ProgressionChords,
	progressionCountWith: ReadonlyMap<string, number>,
	progressionCount: number,
	hasColor: (tonality: KeyTonality, roman: string) => boolean
): string => {
	const { tonality } = progression;
	const counts = new Map<string, number>();
	for (const chord of normalizedChords(progression)) {
		if (chord === TONIC[tonality] || !hasColor(tonality, chord)) continue;
		counts.set(chord, (counts.get(chord) ?? 0) + 1);
	}
	let best = TONIC[tonality];
	let bestScore = -Infinity;
	for (const [chord, count] of counts) {
		const withChord = progressionCountWith.get(chordKey(tonality, chord)) ?? 1;
		const score = count * Math.log((progressionCount + 1) / withChord);
		if (score > bestScore || (score === bestScore && chord < best)) {
			best = chord;
			bestScore = score;
		}
	}
	return best;
};

// Each cluster takes the color of its progression's signature chord, from
// the chord color source (see chordColors.ts): major-key clusters land on
// the warm side, minor-key on the cool side. A cluster built on several
// progressions blends their signature colors.
export const createSignatureChordStrategy =
	(colorOptions: ChordColorOptions = {}): ClusterColorStrategy =>
	(clusters) => {
		const colorOf = (tonality: KeyTonality, roman: string) =>
			chordColor(tonality, roman, colorOptions);

		const progressionsByCluster = clusters.map(({ progressionNames }) =>
			progressionNames
				.map(progressionChordsByName)
				.filter((chords): chords is ProgressionChords => chords !== null)
		);

		// Rarity is counted over every cluster's progressions, so a chord
		// most clusters share (like IV) loses to one only a few use.
		const progressionCountWith = new Map<string, number>();
		let progressionCount = 0;
		for (const progression of progressionsByCluster.flat()) {
			progressionCount++;
			for (const chord of new Set(normalizedChords(progression))) {
				const key = chordKey(progression.tonality, chord);
				progressionCountWith.set(key, (progressionCountWith.get(key) ?? 0) + 1);
			}
		}

		return new Map(
			clusters.map(({ name }, index) => {
				const colors = progressionsByCluster[index]
					.map((progression) =>
						colorOf(
							progression.tonality,
							signatureChordOf(
								progression,
								progressionCountWith,
								progressionCount,
								(tonality, roman) => colorOf(tonality, roman) !== null
							)
						)
					)
					.filter((color): color is string => color !== null);
				return [
					name,
					colors.length === 0
						? SIGNATURE_FALLBACK_COLOR
						: colors.length === 1
							? colors[0]
							: mixOklab(colors)
				];
			})
		);
	};

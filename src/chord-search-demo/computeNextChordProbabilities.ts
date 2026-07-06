import { degreeQualityToRoman } from "../chord-processing/romanNumerals.js";
import type {
	ParsedProgressionChord,
	SongInput
} from "../chord-processing/types.js";

export type SankeyNode = {
	token: string;
	count: number;
	isChosen: boolean;
};

export type SankeyLayer = {
	nodes: SankeyNode[];
	totalCount: number;
};

const MAX_NEXT_CHORDS = 8;

const MAJOR_SCALE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11] as const;

// Chromatic pitch classes that are one semitone below a diatonic scale degree
const FLAT_PITCH_CLASS_TO_DEGREE: Partial<Record<number, number>> = {
	1: 2, // bII  (C#/Db)
	3: 3, // bIII (D#/Eb)
	8: 6, // bVI  (G#/Ab)
	10: 7 // bVII (A#/Bb)
};

const ROMAN_BASES = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const SUFFIX_TO_QUALITY: Record<string, string> = {
	major: "maj",
	minor: "min",
	diminished: "dim",
	augmented: "aug",
	maj7: "maj",
	"6": "maj",
	add9: "maj",
	sus2: "maj",
	sus4: "maj",
	"9": "maj",
	add11: "maj",
	maj9: "maj",
	"2": "maj",
	m7: "min",
	m9: "min",
	m11: "min",
	dim7: "dim",
	m7b5: "dim",
	"7": "maj",
	"13": "maj",
	"11": "maj"
};

export function chordToRomanToken(
	chord: ParsedProgressionChord
): string | null {
	const quality = SUFFIX_TO_QUALITY[chord.suffix] ?? null;
	if (!quality) return null;

	const degreeIdx = MAJOR_SCALE_PITCH_CLASSES.indexOf(
		chord.rootPitchClass as (typeof MAJOR_SCALE_PITCH_CLASSES)[number]
	);
	if (degreeIdx !== -1) {
		return degreeQualityToRoman(degreeIdx + 1, quality);
	}

	// Borrowed (flat) chord — map chromatic pitch class to bII, bIII, bVI, bVII, etc.
	const flatDegree = FLAT_PITCH_CLASS_TO_DEGREE[chord.rootPitchClass];
	if (flatDegree === undefined) return null;
	const base = ROMAN_BASES[flatDegree - 1];
	if (quality === "maj") return `b${base}`;
	if (quality === "min") return `b${base.toLowerCase()}`;
	if (quality === "dim") return `b${base.toLowerCase()}°`;
	if (quality === "aug") return `b${base}+`;
	return null;
}

function countNextChords(
	songs: SongInput[],
	prefix: string[]
): Map<string, number> {
	const counts = new Map<string, number>();

	for (const song of songs) {
		const tokens = song.romanTokens;
		if (!tokens || tokens.length <= prefix.length) continue;

		const limit = tokens.length - prefix.length;
		outer: for (let i = 0; i < limit; i++) {
			for (let j = 0; j < prefix.length; j++) {
				if (tokens[i + j] !== prefix[j]) continue outer;
			}
			const next = tokens[i + prefix.length];
			counts.set(next, (counts.get(next) ?? 0) + 1);
		}
	}

	return counts;
}

function countsToLayer(
	counts: Map<string, number>,
	chosenToken: string
): SankeyLayer {
	const total = [...counts.values()].reduce((a, b) => a + b, 0);

	const sorted = [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, MAX_NEXT_CHORDS);

	const nodes: SankeyNode[] = sorted.map(([token, count]) => ({
		token,
		count,
		isChosen: token === chosenToken
	}));

	return { nodes, totalCount: total };
}

export type PathStats = {
	matchingSongs: number;
	totalSongs: number;
};

export function countSongsWithSequence(
	songs: SongInput[],
	sequence: string[]
): PathStats {
	const allSongKeys = new Set<string>();
	const matchedSongKeys = new Set<string>();

	for (const song of songs) {
		const tokens = song.romanTokens;
		if (!tokens || tokens.length === 0) continue;

		const key = song.songKey ?? song.id ?? song.title;
		allSongKeys.add(key);
		if (tokens.length < sequence.length) continue;

		const limit = tokens.length - sequence.length + 1;
		outer: for (let i = 0; i < limit; i++) {
			for (let j = 0; j < sequence.length; j++) {
				if (tokens[i + j] !== sequence[j]) continue outer;
			}
			matchedSongKeys.add(key);
			break;
		}
	}

	return { matchingSongs: matchedSongKeys.size, totalSongs: allSongKeys.size };
}

export function computeNextChordData(
	songs: SongInput[],
	searchTokens: string[]
): SankeyLayer[] {
	if (searchTokens.length === 0) return [];

	const layers: SankeyLayer[] = [];

	// Layer 0: the first chosen chord, always 100% width
	layers.push({
		nodes: [{ token: searchTokens[0], count: 1, isChosen: true }],
		totalCount: 1
	});

	// Layers 1..N-1: distribution of next chords given the chosen prefix so far.
	// We stop at searchTokens.length-1 so we only show what the user has already picked,
	// not a prediction of what comes next.
	for (let i = 1; i < searchTokens.length; i++) {
		const prefix = searchTokens.slice(0, i);
		const counts = countNextChords(songs, prefix);
		if (counts.size === 0) break;
		layers.push(countsToLayer(counts, searchTokens[i]));
	}

	return layers;
}

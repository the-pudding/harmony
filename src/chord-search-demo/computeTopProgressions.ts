import type { SongInput } from "../chord-processing/types.js";

export type ProgressionStat = {
	tokens: string[];
	label: string;
	songKeys: Set<string>;
};

export type MinCoverageEntry = {
	label: string;
	tokens: string[];
	addedSongs: number;
	runningTotal: number;
	runningPct: number;
};

const MAX_GRAM_LEN = 6;

function countOccurrences(tokens: string[], gram: string[]): number {
	let count = 0;
	const limit = tokens.length - gram.length + 1;
	outer: for (let i = 0; i < limit; i++) {
		for (let j = 0; j < gram.length; j++) {
			if (tokens[i + j] !== gram[j]) continue outer;
		}
		count++;
	}
	return count;
}

// Returns the longest prefix of `tokens` (between minLength and MAX_GRAM_LEN) that
// appears at least minOccurrences times in the full token array. Returns null if none qualifies.
export function longestQualifyingPrefix(
	tokens: string[],
	opts: { minLength: number; matchAtLeastTwice: boolean }
): string[] | null {
	const minLen = Math.max(2, opts.minLength);
	const minOccurrences = opts.matchAtLeastTwice ? 2 : 1;
	let bestLen = 0;
	for (let len = minLen; len <= Math.min(MAX_GRAM_LEN, tokens.length); len++) {
		if (countOccurrences(tokens, tokens.slice(0, len)) >= minOccurrences) {
			bestLen = len;
		}
	}
	return bestLen > 0 ? tokens.slice(0, bestLen) : null;
}

// Returns the shortest L-length prefix (minLen ≤ L ≤ MAX_GRAM_LEN) such that
// tokens[0..L-1] === tokens[L..2L-1] — i.e., the section literally starts with
// the pattern back-to-back. This correctly identifies the period even when the
// section has a different ending (e.g. I V vi IV I V vi IV I V bVII bVI → [I V vi IV]).
function periodByFirstRepeat(tokens: string[], minLen: number): string[] | null {
	for (let L = minLen; L * 2 <= tokens.length && L <= MAX_GRAM_LEN; L++) {
		if (tokens.slice(0, L).every((t, i) => t === tokens[L + i])) {
			return tokens.slice(0, L);
		}
	}
	return null;
}

// Returns the fundamental attribution for a section: the structural repeating unit
// if one is detected, otherwise the longest qualifying prefix.
export function fundamentalAttribution(
	tokens: string[],
	opts: { minLength: number; matchAtLeastTwice: boolean }
): string[] | null {
	const minLen = Math.max(2, opts.minLength);
	const period = periodByFirstRepeat(tokens, minLen);
	if (period) return period;
	return longestQualifyingPrefix(tokens, { minLength: minLen, matchAtLeastTwice: opts.matchAtLeastTwice });
}

export function computeTopProgressions(
	songs: SongInput[],
	opts: { aggregateRepeats: boolean; matchAtBeginningOnly: boolean; matchAtLeastTwice: boolean; minLength?: number },
	topN = 30
): ProgressionStat[] {
	const gramToSongs = new Map<string, Set<string>>();
	const minLen = Math.max(2, opts.minLength ?? 2);
	const minOccurrences = opts.matchAtLeastTwice ? 2 : 1;

	for (const song of songs) {
		const tokens = song.romanTokens;
		if (!tokens || tokens.length === 0) continue;
		const key = song.songKey ?? song.id ?? song.title;

		if (opts.matchAtBeginningOnly) {
			// Only attribute to the fundamental (backbone) period or longest qualifying prefix.
			// Prevents I→IV from counting when I→IV→V→vi is the actual structural unit.
			const best = fundamentalAttribution(tokens, {
				minLength: minLen,
				matchAtLeastTwice: opts.matchAtLeastTwice
			});
			if (best) {
				const label = best.join("→");
				if (!gramToSongs.has(label)) gramToSongs.set(label, new Set());
				gramToSongs.get(label)!.add(key);
			}
		} else {
			// For each start position, attribute only to the longest gram from that position
			// that meets the occurrence threshold.
			const maximalLabels = new Set<string>();
			for (let i = 0; i < tokens.length; i++) {
				let bestLen = 0;
				for (let len = minLen; len <= Math.min(MAX_GRAM_LEN, tokens.length - i); len++) {
					const gram = tokens.slice(i, i + len);
					if (countOccurrences(tokens, gram) >= minOccurrences) {
						bestLen = len;
					}
				}
				if (bestLen > 0) {
					maximalLabels.add(tokens.slice(i, i + bestLen).join("→"));
				}
			}
			for (const label of maximalLabels) {
				if (!gramToSongs.has(label)) gramToSongs.set(label, new Set());
				gramToSongs.get(label)!.add(key);
			}
		}
	}

	return [...gramToSongs.entries()]
		.map(([label, songKeys]) => ({ tokens: label.split("→"), label, songKeys }))
		.sort((a, b) => b.songKeys.size - a.songKeys.size)
		.slice(0, topN);
}

export function filterSubsumedProgressions(progressions: ProgressionStat[]): ProgressionStat[] {
	return progressions.filter(
		(p) =>
			!progressions.some((other) => {
				if (other.tokens.length <= p.tokens.length) return false;
				const limit = other.tokens.length - p.tokens.length + 1;
				outer: for (let i = 0; i < limit; i++) {
					for (let j = 0; j < p.tokens.length; j++) {
						if (other.tokens[i + j] !== p.tokens[j]) continue outer;
					}
					return true;
				}
				return false;
			})
	);
}

export function computeMinCoverageSet(
	progressions: ProgressionStat[],
	totalSongs: number,
	threshold = 0.7,
	maxEntries = 25
): MinCoverageEntry[] {
	const covered = new Set<string>();
	const result: MinCoverageEntry[] = [];
	const pool = [...progressions];

	while (
		covered.size / totalSongs < threshold &&
		pool.length > 0 &&
		result.length < maxEntries
	) {
		let bestIdx = 0;
		let bestNewCount = 0;
		for (let i = 0; i < pool.length; i++) {
			let newCount = 0;
			for (const key of pool[i].songKeys) {
				if (!covered.has(key)) newCount++;
			}
			if (newCount > bestNewCount) {
				bestNewCount = newCount;
				bestIdx = i;
			}
		}
		if (bestNewCount === 0) break;

		const best = pool.splice(bestIdx, 1)[0];
		for (const key of best.songKeys) covered.add(key);

		result.push({
			label: best.label,
			tokens: best.tokens,
			addedSongs: bestNewCount,
			runningTotal: covered.size,
			runningPct: covered.size / totalSongs
		});
	}
	return result;
}

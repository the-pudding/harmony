export const CONTENT_NGRAM_MIN_LENGTH = 2;
export const CONTENT_NGRAM_MAX_LENGTH = 3;

// Produces a set of content-describing feature keys for a given progression string
// and scale. These keys are shared across progressions that have similar harmonic
// content, so songs matching vi-ii-V-I and ii-V-I will share most of their
// content keys even though their progression identities are orthogonal.
export const progressionContentKeys = (
	chordProgression: string,
	scale: string
): string[] => {
	const tokens = chordProgression.split("-");
	const n = tokens.length;
	if (n === 0) return [];

	const keys: string[] = [];

	// Cyclic n-grams: wrap around so all rotations of the same loop share identical
	// gram sets — I-V-vi-IV and vi-IV-I-V produce exactly the same bigrams/trigrams.
	for (
		let length = CONTENT_NGRAM_MIN_LENGTH;
		length <= Math.min(CONTENT_NGRAM_MAX_LENGTH, n);
		length++
	) {
		// When length === n the progression is its own only window, so produce just one.
		const windowCount = length < n ? n : 1;
		for (let start = 0; start < windowCount; start++) {
			const gram = Array.from({ length }, (_, i) => tokens[(start + i) % n]);
			keys.push(`${scale}:gram:${gram.join("-")}`);
		}
	}

	// Order-free degree set: captures which chord degrees are used without caring
	// about sequence, so I-IV-V and I-V-IV collide here (sharing a feature).
	const degreeSet = [...new Set(tokens)].sort().join(",");
	keys.push(`${scale}:degrees:${degreeSet}`);

	// Cadence: the wrap-around harmonic motion from the last chord back to the first.
	// This encodes whether the loop "resolves" (e.g. V→I) or "prolongs" (e.g. IV→I).
	if (n >= 2) {
		keys.push(`${scale}:cadence:${tokens[n - 1]}-${tokens[0]}`);
	}

	return keys;
};

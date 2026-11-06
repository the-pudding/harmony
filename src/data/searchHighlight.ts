// Splitting a song title, artist or cluster name into the parts a search
// matched and the parts it didn't, so the matches can be highlighted.
//
// Search compares normalized text (no accents, apostrophes or punctuation,
// lowercase), so this normalizes character by character, remembering which
// original character each normalized one came from.

export type Segment = { text: string; match: boolean };

const normalizeChar = (char: string): string => {
	if (/['’]/.test(char)) return "";
	const folded = char.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
	return /^[\p{L}\p{N}]+$/u.test(folded) ? folded : " ";
};

export const highlightSegments = (
	text: string,
	words: readonly string[]
): Segment[] => {
	const chars = [...text];
	let normalized = "";
	const sourceIndex: number[] = [];
	chars.forEach((char, index) => {
		for (const folded of normalizeChar(char)) {
			normalized += folded;
			sourceIndex.push(index);
		}
	});

	const matched = chars.map(() => false);
	for (const word of words) {
		if (!word) continue;
		for (
			let at = normalized.indexOf(word);
			at !== -1;
			at = normalized.indexOf(word, at + word.length)
		) {
			for (let index = at; index < at + word.length; index++)
				matched[sourceIndex[index]] = true;
		}
	}

	// Characters search drops (apostrophes) join a match on both sides of
	// them: "Don’t" for "dont".
	const dropped = new Set(chars.flatMap((char, index) => (normalizeChar(char) ? [] : [index])));
	for (const index of dropped)
		if (matched[index - 1] && matched[index + 1]) matched[index] = true;

	const segments: Segment[] = [];
	chars.forEach((char, index) => {
		const last = segments[segments.length - 1];
		if (last && last.match === matched[index]) last.text += char;
		else segments.push({ text: char, match: matched[index] });
	});
	return segments;
};

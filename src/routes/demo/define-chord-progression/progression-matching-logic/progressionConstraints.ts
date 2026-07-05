export const MIN_PROGRESSION_LENGTH = 3;
export const MAX_PROGRESSION_LENGTH = 8;

const blockRepeatsAt = (
	tokens: readonly string[],
	start: number,
	blockLength: number
): boolean =>
	Array.from(
		{ length: blockLength },
		(_, i) => tokens[start + i] === tokens[start + blockLength + i]
	).every(Boolean);

export const hasConsecutivelyRepeatedBlock = (
	tokens: readonly string[],
	minBlockLength: number = MIN_PROGRESSION_LENGTH
): boolean =>
	tokens.some((_, start) =>
		Array.from(
			{
				length:
					Math.floor((tokens.length - start) / 2) - minBlockLength + 1
			},
			(_, offset) => minBlockLength + offset
		).some((blockLength) => blockRepeatsAt(tokens, start, blockLength))
	);

export const isSelfRepeatingProgression = (chordProgression: string): boolean =>
	hasConsecutivelyRepeatedBlock(chordProgression.split("-"));

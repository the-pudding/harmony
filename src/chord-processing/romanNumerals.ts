const ROMAN_BASE = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

export const degreeQualityToRoman = (
	degree: number,
	quality: string
): string | null => {
	if (degree < 1 || degree > ROMAN_BASE.length) return null;

	const base = ROMAN_BASE[degree - 1];

	if (quality === "maj") return base;
	if (quality === "min") return base.toLowerCase();
	if (quality === "dim") return `${base.toLowerCase()}°`;
	if (quality === "aug") return `${base}+`;

	return null;
};

export const gramLabel = (tokens: string[]): string => tokens.join("→");

export const dedupeAdjacentTokens = (tokens: string[]): string[] =>
	tokens.filter((token, index) => index === 0 || token !== tokens[index - 1]);

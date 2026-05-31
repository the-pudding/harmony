export const MAJOR = "major";
export const MINOR = "minor";
export const DOM7 = "7";
export const DIM = "dim";
export const AUG = "aug";

export const FUZZY_SUFFIX_MAP: Record<string, string> = {
	major: MAJOR,
	sus2: MAJOR,
	sus4: MAJOR,
	add9: MAJOR,
	"6": MAJOR,
	maj7: MAJOR,
	maj9: MAJOR,
	"6/9": MAJOR,
	minor: MINOR,
	minor7: MINOR,
	"minor add9": MINOR,
	minor9: MINOR,
	"minor maj7": MINOR,
	"7": DOM7,
	"9": DOM7,
	"7sus4": DOM7,
	diminished: DIM,
	dim7: DIM,
	m7b5: DIM,
	augmented: AUG
};

export const simplifySuffix = (suffix: string): string =>
	FUZZY_SUFFIX_MAP[suffix] ?? suffix;

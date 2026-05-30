export const FUZZY_SUFFIX_MAJOR = "major";
export const FUZZY_SUFFIX_MINOR = "minor";
export const FUZZY_SUFFIX_DOM7 = "dom7";
export const FUZZY_SUFFIX_DIM = "dim";
export const FUZZY_SUFFIX_AUG = "aug";

export const FUZZY_SUFFIX_MAP: Record<string, string> = {
	major: FUZZY_SUFFIX_MAJOR,
	sus2: FUZZY_SUFFIX_MAJOR,
	sus4: FUZZY_SUFFIX_MAJOR,
	add9: FUZZY_SUFFIX_MAJOR,
	"6": FUZZY_SUFFIX_MAJOR,
	maj7: FUZZY_SUFFIX_MAJOR,
	maj9: FUZZY_SUFFIX_MAJOR,
	"6/9": FUZZY_SUFFIX_MAJOR,
	minor: FUZZY_SUFFIX_MINOR,
	minor7: FUZZY_SUFFIX_MINOR,
	"minor add9": FUZZY_SUFFIX_MINOR,
	minor9: FUZZY_SUFFIX_MINOR,
	"minor maj7": FUZZY_SUFFIX_MINOR,
	"7": FUZZY_SUFFIX_DOM7,
	"9": FUZZY_SUFFIX_DOM7,
	"7sus4": FUZZY_SUFFIX_DOM7,
	diminished: FUZZY_SUFFIX_DIM,
	dim7: FUZZY_SUFFIX_DIM,
	m7b5: FUZZY_SUFFIX_DIM,
	augmented: FUZZY_SUFFIX_AUG
};

export const simplifySuffix = (suffix: string): string =>
	FUZZY_SUFFIX_MAP[suffix] ?? suffix;

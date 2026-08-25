import type { ScaleName } from "../../../../../chord-processing/scales.js";

export type ScaleAxisSection = { scale: ScaleName; romanTokens: readonly string[] };
export type ScaleAxisSong = { sections: readonly ScaleAxisSection[] };

// +1 = entirely major, -1 = entirely minor, 0 = evenly split, unmatched, or
// entirely in some other mode (dorian, mixolydian, etc.) — those modal
// chords count toward the total (diluting confidence toward 0) but don't
// push the score toward either pole, since this axis is deliberately just
// about major vs. minor, not the fuller brightness notion featureAxes.ts
// already covers.
export const computeMajornessScore = (song: ScaleAxisSong): number => {
	let majorMinusMinor = 0;
	let totalChords = 0;
	for (const section of song.sections) {
		const chordCount = section.romanTokens.length;
		totalChords += chordCount;
		if (section.scale === "major") majorMinusMinor += chordCount;
		else if (section.scale === "minor") majorMinusMinor -= chordCount;
	}
	return totalChords === 0 ? 0 : majorMinusMinor / totalChords;
};

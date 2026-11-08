// The chord progression a cluster is named for, and its scale. Most map
// clusters are top progressions; the rest are named by their progressions
// ("I-IV vamp · Cheerleader (verse)") or numerals ("V-I-IV"), so the first
// one is used, as a core progression's chords or as numerals.
import progressionsData from "$data/charts/top-progressions.csv";
import coreProgressions from "$data/core-progressions.js";
import { romanRe } from "$utils/chordify.js";

export type ClusterProgression = {
	// Roman numerals joined by dashes, e.g. "I-V-vi-IV".
	chordProgression: string;
	tonality: "major" | "minor";
};

const tonalityOf = (scale: string | undefined) =>
	scale === "minor" ? "minor" : "major";

export const progressionFor = (
	clusterName: string | null | undefined
): ClusterProgression | undefined => {
	if (!clusterName) return undefined;
	const top = (
		progressionsData as {
			name: string;
			chordProgression: string;
			scale: string;
		}[]
	).find((d) => d.name === clusterName);
	if (top)
		return {
			chordProgression: top.chordProgression,
			tonality: tonalityOf(top.scale)
		};

	const first = clusterName.split(" · ")[0].trim();
	const core = coreProgressions.find((d) => d.name === first);
	if (core)
		return {
			chordProgression: [core.chordProgression].flat()[0],
			tonality: tonalityOf(core.scale)
		};
	const isRoman = first.split("-").every((r) => romanRe.test(r.trim()));
	return isRoman ? { chordProgression: first, tonality: "major" } : undefined;
};

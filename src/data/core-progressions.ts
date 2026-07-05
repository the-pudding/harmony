import type { ScaleName } from "../chord-processing/scales.js";

export type CoreProgression = {
	name: string;
	chordProgression: string;
	scale: ScaleName;
	description: string;
	technicalNotes?: string;
};

const coreProgressions: CoreProgression[] = [
	// Happy, major-y progressions ------------------------------------------------
	{
		name: "basic plagal",
		chordProgression: "I-IV-I-IV",
		scale: "major",
		description: ""
	},
	{
		name: "basic perfect",
		chordProgression: "I-V-I-V",
		scale: "major",
		description: ""
	},
	{
		name: "IV-V vamp",
		chordProgression: "IV-V-IV-V",
		scale: "major",
		description: "",
		technicalNotes:
			"Teenage Dream and Call Me Maybe are variants of this with a vi passing chord"
	},
	{
		name: "Cheerleader Verse",
		chordProgression: "I-V-IV",
		scale: "major",
		description: ""
	},
	{
		name: "Cheerleader Chorus",
		chordProgression: "I-IV-V-IV",
		scale: "major",
		description: ""
	},
	{
		name: "major-y",
		chordProgression: "I-V-IV-V",
		scale: "major",
		description: ""
	},
	{
		name: "mixolydian vamp",
		chordProgression: "I-bVII-IV",
		scale: "mixolydian",
		description: ""
	}, // also could be thought of as a V-IV-I

	{
		name: "minor-y",
		chordProgression: "i-bVII-v-bVI",
		scale: "minor",
		description: ""
	},
	{
		name: "burnin up with you baby",
		chordProgression: "i-III-VII-VI",
		scale: "minor",
		description: ""
	},
	// TEMP: hide this progression, because we're testing a bug that only appears in lady-gaga__poker-face with it gone.
	// {
	// 	name: "poker face",
	// 	chordProgression: "i-VI-III-VII",
	// 	scale: "minor",
	// 	description: ""
	// },
	{
		name: "axis of awesome",
		chordProgression: "I-V-vi-IV",
		scale: "major",
		description: ""
	},
	{
		name: "doo wop",
		chordProgression: "I-vi-IV-V",
		scale: "major",
		description: ""
	},
	{
		name: "dark doo wop (save your tears for another day)",
		chordProgression: "I-vi-iii-V",
		scale: "major",
		description: ""
	},

	{
		name: "jazz changes",
		chordProgression: "vi-ii-V-I",
		scale: "major",
		description: ""
	},
	{
		name: "andalusian cadence",
		chordProgression: "i-bVII-bVI-V",
		scale: "harmonicMinor",
		description: ""
	},
	{
		name: "call me by your (andalusian) name",
		chordProgression: "I-bII-I-bII",
		scale: "phrygianDominant",
		description: ""
	},
	{
		name: "boyband",
		chordProgression: "bVI-V-i",
		scale: "minor",
		description: ""
	},
	{
		name: "royal road",
		chordProgression: "IV-V-iii-vi",
		scale: "major",
		description: ""
	},
	{
		name: "plagal cascade",
		chordProgression: "i-bIII-bVII-IV",
		scale: "minor",
		description: ""
	},
	{
		name: "pachelbel canon",
		chordProgression: "I-V-vi-iii-IV-I-IV-V",
		scale: "major",
		description: ""
	},
	{
		name: "turnaround",
		chordProgression: "I-vi-ii-V",
		scale: "major",
		description: ""
	},
	{
		name: "neo-soul",
		chordProgression: "IVmaj7-iii7-vi7-ii7",
		scale: "major",
		description: ""
	},
	{
		name: "jazz ii-V-I",
		chordProgression: "ii7-V7-Imaj7",
		scale: "major",
		description: ""
	},
	// todo: handle diminished chords, which seem not to work
	{
		name: "minor ii-V-i",
		chordProgression: "ii°7-V7-i",
		scale: "minor",
		description: ""
	},
	{
		name: "cinquillo",
		chordProgression: "I-IV-I-V",
		scale: "major",
		description: ""
	},
	{
		name: "pop minor",
		chordProgression: "i-bVI-bIII-bVII",
		scale: "minor",
		description: ""
	}
];

export const progressionsThatDidntMatchAnything: CoreProgression[] = [
	{
		name: "japanese pop",
		chordProgression: "IV-V-ii-vi",
		scale: "major",
		description: ""
	},
	{
		name: "blues",
		chordProgression: "I-I-I-I-IV-IV-I-I-V-IV-I-V",
		scale: "major",
		description: ""
	},
	{
		name: "minor turnaround",
		chordProgression: "i-VI-III-VII",
		scale: "minor",
		description: ""
	},
	{
		name: "flamenco",
		chordProgression: "i-VII-VI-V",
		scale: "harmonicMinor",
		description: ""
	},
	{
		name: "circle of fifths",
		chordProgression: "I-IV-VII-III-VI-II-V-I",
		scale: "major",
		description: ""
	},
	{
		name: "creep",
		chordProgression: "I-III-IV-iv",
		scale: "major",
		description: ""
	}
];

export default coreProgressions;

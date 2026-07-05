export type CoreProgression = {
	name: string;
	chordProgression: string;
	description: string;
	technicalNotes?: string;
};

const coreProgressions: CoreProgression[] = [
	// Happy, major-y progressions ------------------------------------------------
	{ name: "basic plagal", chordProgression: "I-IV-I-IV", description: "" },
	{ name: "basic perfect", chordProgression: "I-V-I-V", description: "" },
	{
		name: "IV-V vamp",
		chordProgression: "IV-V-IV-V",
		description: "",
		technicalNotes:
			"Teenage Dream and Call Me Maybe are variants of this with a vi passing chord"
	},
	{ name: "Cheerleader Verse", chordProgression: "I-V-IV", description: "" },
	{
		name: "Cheerleader Chorus",
		chordProgression: "I-IV-V-IV",
		description: ""
	},
	{ name: "major-y", chordProgression: "I-V-IV-V", description: "" },
	{ name: "mixolydian vamp", chordProgression: "I-bVII-IV", description: "" }, // also could be thought of as a V-IV-I

	{ name: "minor-y", chordProgression: "i-bVII-v-bVI", description: "" },
	{
		name: "burnin up with you baby",
		// TODO: these numerals are based on a the minor scale (not major), but that's currently not supported by the parse
		chordProgression: "i-III-VII-VI",
		description: ""
	},
	{ name: "axis of awesome", chordProgression: "I-V-vi-IV", description: "" },
	{ name: "doo wop", chordProgression: "I-vi-IV-V", description: "" },
	{
		name: "dark doo wop (save your tears for another day)",
		chordProgression: "I-vi-iii-V",
		description: ""
	},

	{ name: "jazz changes", chordProgression: "vi-ii-V-I", description: "" },
	{
		name: "andalusian cadence",
		chordProgression: "i-bVII-bVI-V",
		description: ""
	},
	{
		name: "call me by your (andalusian) name",
		chordProgression: "I-bII-I-bII",
		description: ""
	},
	{ name: "boyband", chordProgression: "bVI-V-i", description: "" },
	{ name: "royal road", chordProgression: "IV-V-iii-vi", description: "" },
	{
		name: "plagal cascade",
		chordProgression: "i-bIII-bVII-IV",
		description: ""
	},
	{
		name: "pachelbel canon",
		chordProgression: "I-V-vi-iii-IV-I-IV-V",
		description: ""
	},
	{ name: "turnaround", chordProgression: "I-vi-ii-V", description: "" },
	{ name: "neo-soul", chordProgression: "IVM7-iii7-vi7-ii7", description: "" },
	{ name: "jazz ii-V-I", chordProgression: "ii7-V7-IM7", description: "" },
	// todo: handle diminished chords, which seem not to work
	{ name: "minor ii-V-i", chordProgression: "ii°7-V7-i", description: "" },
	{ name: "cinquillo", chordProgression: "I-IV-I-V", description: "" },
	{ name: "pop minor", chordProgression: "i-bVI-bIII-bVII", description: "" }
];

export const progressionsThatDidntMatchAnything: CoreProgression[] = [
	{ name: "japanese pop", chordProgression: "IV-V-ii-vi", description: "" },
	{
		name: "blues",
		chordProgression: "I-I-I-I-IV-IV-I-I-V-IV-I-V",
		description: ""
	},
	{
		name: "minor turnaround",
		chordProgression: "i-VI-III-VII",
		description: ""
	},
	{ name: "flamenco", chordProgression: "i-VII-VI-V", description: "" },
	{
		name: "circle of fifths",
		chordProgression: "I-IV-VII-III-VI-II-V-I",
		description: ""
	},
	{ name: "creep", chordProgression: "I-III-IV-iv", description: "" }
];

export default coreProgressions;

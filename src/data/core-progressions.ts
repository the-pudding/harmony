import type { ScaleName } from "../chord-processing/scales.js";


export type ProgressionGroup = {
	name: string;
	description: string;
	progressions: CoreProgression[];
};

const happyMajoryProgressions: ProgressionGroup = {
	name: "Happy, major-y progressions",
	description: "Progressions that are happy and major-y",
	progressions: [
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
			name: "beer never broke my <3",
			chordProgression: "I-IV-I-V",
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
			name: "sweet home mixolydian",
			chordProgression: "I-bVII-IV",
			scale: "major",
			description: "Sweet Home Alabama..."
		} // also could be thought of as a V-IV-I
	]
};

const fourFiveVampProgressions: ProgressionGroup = {
	name: "Four-five vamp progressions",
	description: "we could do this all day, and still leave you hungry for I",
	progressions: [
		{
			name: "IV-V vamp",
			chordProgression: "IV-V-IV-V",
			scale: "major",
			description: "",
			technicalNotes: "a hungry energy that never settles back to the I"
		}
		// TODO: matches Teenage Dream perfectly, should match Call Me Maybe perfectly once we hand correct it.
		// However, I feel with our simplistic greeny match algorithm, it overall decreases general match percentage coverage.
		// Maybe needs some rework (or a more stringent match criteria)
		// {
		// 	name: "IV-(vi)-V vamp",
		// 	chordProgression: "IV-vi-V",
		// 	scale: "major",
		// 	description: "",
		// 	technicalNotes:
		// 		"just IV-V with a lil passing chord to keep it interesting"
		// }
	]
};

const axisOfAwesomeProgressions: ProgressionGroup = {
	name: "Axis of Awesome family",
	description: "Progressions that are axis of awesome",
	progressions: [
		{
			name: "axis of awesome",
			chordProgression: "I-V-vi-IV",
			scale: "major",
			description: ""
		},
		{
			name: "never getting back together",
			chordProgression: "IV-I-V-vi",
			scale: "major",
			description: ""
		},
		{
			name: "(minor)axis of awesome",
			chordProgression: "vi-IV-I-V",
			scale: "major",
			description: "repeats starting on vi instead of I"
		}
	]
};

const minoryProgressions: ProgressionGroup = {
	name: "Minor-y progressions",
	description: "Progressions that are minor-y",
	progressions: [
		{
			name: "minor-y",
			chordProgression: "i-VII-v-VI",
			scale: "minor",
			description: ""
		},
		{
			name: "burnin up with you",
			chordProgression: "i-III-VII-VI",
			scale: "minor",
			description: ""
		},
		{
			name: "dorian build up",
			chordProgression: "ii-I-V",
			scale: "major",
			description:
				"experimental: game up in Good 4 U prominently, it's sort of a spin on ii-V-I, but doesn't require the jazzy extensions to sound fresh..."
		},
		{
			name: "andalusian cadence",
			chordProgression: "i-VII-VI-V",
			scale: "minor",
			description: ""
		},
		{
			name: "call me by your (andalusian) name",
			chordProgression: "I-bII-I-bII",
			scale: "major", // we could re-write as phrygian dominant, but is that actually clearer?
			description: ""
		},
		{
			name: "broody walk down",
			chordProgression: "i-VI-V",
			scale: "minor",
			description: "Similar to i-VII-VI-V, but jumps to the VI"
		},
		{
			name: "plagal cascade",
			chordProgression: "i-III-VII-IV",
			scale: "minor",
			description: ""
		},
		{
			name: "pop minor (poker face)",
			chordProgression: "i-VI-III-VII",
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
			name: "boyband",
			chordProgression: "VI-V-i",
			scale: "minor",
			description: ""
		}
	]
};

const jazzyProgressions: ProgressionGroup = {
	name: "Jazzy progressions",
	description: "Progressions that are jazzy",
	progressions: [
		{
			name: "neo-soul",
			chordProgression: "IVmaj7-iii7-vi7-ii7",
			scale: "major",
			description: ""
		},

		{
			name: "minor ii-V-i",
			// todo: handle diminished chords, which seem not to work
			chordProgression: "ii°7-V7-i",
			scale: "minor",
			description: ""
		},
		{
			name: "jazz ii-V-I",
			chordProgression: "ii7-V7-Imaj7",
			scale: "major",
			description: ""
		},
		{
			name: "jazz changes (turnaround)",
			chordProgression: "vi-ii-V-I",
			scale: "major",
			description: ""
		},
		{
			name: "jazz changes (start on I)",
			chordProgression: "I-vi-ii-V",
			scale: "major",
			description: ""
		}
	]
};

const emoPopProgressions: ProgressionGroup = {
	name: "Emo pop progressions",
	description:
		"Honestly not fully sure if this should be a category, but didn't fit well into happy major-y",
	progressions: [
		{
			name: "whatcha say",
			chordProgression: "IV-I-vi-V",
			scale: "major",
			description:
				"Similar strengths to other four chord classics, but starting on the IV makes it feel fresh/yearn-y. Peaked in mid 2010s"
		},

		{
			name: "save your tears",
			chordProgression: "I-vi-iii-V",
			scale: "major",
			description: ""
		},

		{
			name: "IV-iv-I turnaround",
			chordProgression: "IV-iv-I",
			scale: "major",
			description:
				"TODO: try to match just IV-iv? (often I only arrives in a subsequent section)"
		},
		{
			name: "creep",
			chordProgression: "I-III-IV",
			scale: "major",
			description: ""
		},
		{
			name: "stay with me",
			chordProgression: "vi-IV-I",
			scale: "major",
			description:
				"a sorta pop-y, emo ii-V-I (technically also matches looped axis of awesome)"
		}
	]
};

export type CoreProgression = {
	name: string;
	chordProgression: string;
	scale: ScaleName;
	description: string;
	technicalNotes?: string;
};

const coreProgressions: CoreProgression[] = [
	...happyMajoryProgressions.progressions,
	...fourFiveVampProgressions.progressions,
	...axisOfAwesomeProgressions.progressions,
	...minoryProgressions.progressions,
	...jazzyProgressions.progressions,
	...emoPopProgressions.progressions
];

export const progressionsThatDidntMatchAnything: CoreProgression[] = [];

export default coreProgressions;

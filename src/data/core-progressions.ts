import type { ScaleName } from "../chord-processing/scales.js";

// Three-chord shapes are short enough that two stray occurrences turn up almost
// anywhere, so they only count when at least one pair repeats back-to-back.
export const BACK_TO_BACK_REPEAT = 2;

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
			name: "I-IV vamp",
			chordProgression: "I-IV-I-IV",
			scale: "major",
			matchRomanNumeralsExactly: true,
			description: ""
		},
		// Disabled: a shape that starts and ends on the same chord can never
		// satisfy BACK_TO_BACK_REPEAT — two instances in a row would read
		// I-V-I-I-V-I, which the adjacent-duplicate collapse rewrites as
		// I-V-I-V-I. Their coverage moved to "I-V vamp" / "I-IV vamp" instead.
		// {
		// 	name: "I V I",
		// 	chordProgression: "I-V-I",
		// 	scale: "major",
		// 	matchRomanNumeralsExactly: true,
		// 	minimumContiguousMatches: BACK_TO_BACK_REPEAT,
		// 	description: ""
		// },
		// {
		// 	name: "I IV I",
		// 	chordProgression: "I-IV-I",
		// 	scale: "major",
		// 	matchRomanNumeralsExactly: true,
		// 	minimumContiguousMatches: BACK_TO_BACK_REPEAT,
		// 	description: ""
		// },
		{
			name: "I-V vamp",
			chordProgression: "I-V-I-V",
			scale: "major",
			matchRomanNumeralsExactly: true,
			description: ""
		},
		{
			name: "I-vi vamp",
			chordProgression: "I-vi-I-vi",
			scale: "major",
			matchRomanNumeralsExactly: true,
			description: ""
		},
		{
			name: "Cheerleader (verse)",
			chordProgression: "I-V-IV",
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "Cheerleader (chorus)",
			chordProgression: "I-IV-V-IV",
			scale: "major",
			description: ""
		},
		{
			name: "silly love songs",
			chordProgression: "I-iii-IV",
			scale: "major",
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "happy walk up", // found as a "potential core progression" cuz it gets matched a lot by our algorithm
			chordProgression: "I-IV-V",
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "happy walk down", // found as a "potential core progression" cuz it gets matched a lot by our algorithm
			chordProgression: "IV-V-I",
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
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
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: "Sweet Home Alabama... can also be thought of as a V-IV-I"
		}, // also could be thought of as a V-IV-I
		{
			name: "addicted to love",
			chordProgression: "I-bVII-IV-V",
			scale: "major",
			description:
				"the mixolydian walk down, but resolved by a V that pulls it back home"
		}
	]
};

const fourFiveVampProgressions: ProgressionGroup = {
	name: "Four-five vamp progressions",
	description: "we could do this all day, and still leave you hungry for I",
	progressions: [
		{
			name: "V-IV vamp",
			chordProgression: "V-IV-V-IV",
			scale: "major",
			description: "",
			technicalNotes: "feels to me even fresher and edgier than the IV-V vamp"
		},
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
			name: "(mini)axis of awesome",
			chordProgression: "I-V-vi",
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "axis of angsty",
			chordProgression: "I-iii-vi-IV",
			scale: "major",
			description: "swaps out the V for an angsty iii"
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
		},
		{
			name: "mr. brightside",
			chordProgression: "I-IV-vi-V",
			scale: "major",
			description: "reverse-direction axis of awesome cycle"
		},
		{
			name: "whatcha say",
			chordProgression: "IV-I-vi-V",
			scale: "major",
			description:
				"Similar strengths to other four chord classics, but starting on the IV makes it feel fresh/yearn-y. Peaked in mid 2010s"
		},
		{
			name: "emo walk down",
			chordProgression: [
				"I-Imaj7-vi-V-IV",
				"I-Imaj7-vi-V-IV-V",
				"I-Imaj7-vi-IV",
				// Less stringent versions:
				"I-vi-V-IV",
				"I-vi-V-IV-V"
				// "I-vi-IV",
			],
			scale: "major",
			description:
				"The I→Imaj7 step is the signature — bare I then maj7 before the walk down"
		},
		{
			name: "viva la vida",
			chordProgression: "IV-V-I-vi",
			scale: "major",
			description:
				"starts with an optimistic IV-V lift, then sort of has this melancholy I-vi dip"
		}
	]
};

const minoryProgressions: ProgressionGroup = {
	name: "Minor-y progressions",
	description: "Progressions that are minor-y",
	progressions: [
		{
			name: "minor-y", // TODO: better name
			chordProgression: "i-VII-v-VI",
			scale: "minor",
			description: ""
		},
		{
			name: "party rock",
			chordProgression: "i-VII-VI",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "come & get it",
			chordProgression: "i-III-VI-iv",
			scale: "minor",
			// matchRomanNumeralsExactly: true,
			description: ""
		},
		{
			name: "classic i-iv-V", // TODO: better name
			chordProgression: "i-iv-V",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "gangnam verse i-iv-v",
			chordProgression: "i-iv-v",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "i VI vamp",
			chordProgression: "i-VI-i-VI",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: ""
		},
		{
			name: "dangerous",
			chordProgression: "i-III-VI",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "i VI VII",
			chordProgression: "i-VI-VII",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "rockabye",
			chordProgression: "i-VI-VII-v",
			scale: "minor",
			description:
				"[in a major key reference point] starts on a darker minor six, and the V doesn't take us home but to the melancholy iii"
		},
		{
			name: "tainted love",
			chordProgression: "i-III-VI-IV",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: "lifts out of the i, then brightens onto a major IV"
		},
		{
			name: "adore you",
			chordProgression: "i-III-VI-VII",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: "a full lift out of the i, rising all the way to the VII"
		},
		{
			name: "lean on",
			chordProgression: "VI-VII-i-III",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: "the adore you cycle, rotated to start on the VI"
		},
		{
			name: "come undone",
			chordProgression: "III-VI-VII-i",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: "the adore you cycle, rotated to land on the i"
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
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description:
				"experimental: game up in Good 4 U prominently, it's sort of a spin on ii-V-I, but doesn't require the jazzy extensions to sound fresh..."
		},
		{
			name: "flamenco walk down",
			chordProgression: "i-VII-VI-V",
			scale: "minor",
			description: ""
		},
		{
			name: "call me by your (flamenco) name",
			chordProgression: "I-bII-I-bII",
			scale: "major", // we could re-write as phrygian dominant, but is that actually clearer?
			description: ""
		},
		{
			name: "beat it vamp",
			chordProgression: "i-VII-i-VII",
			scale: "minor",
			description: ""
		},
		{
			name: "somebody that i used to know",
			chordProgression: "i-VII-VI-VII",
			scale: "minor",
			description: ""
		},

		{
			name: "broody walk down",
			chordProgression: "i-VI-V",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: "Similar to i-VII-VI-V, but jumps to the VI"
		},
		{
			name: "plagal cascade",
			chordProgression: "i-III-VII-IV",
			scale: "minor",
			description: ""
		},
		{
			name: "poker face (chorus)",
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
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "go your own way",
			chordProgression: "vi-IV-V",
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "rising sun",
			chordProgression: "i-III-IV-VI",
			scale: "minor",
			description: ""
		},
		{
			name: "kissed a girl",
			chordProgression: "i-III-iv-VI",
			scale: "minor",
			description: ""
		},
		{
			name: "i v vamp",
			chordProgression: "i-v-i-v",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: ""
		},
		{
			name: "i iv vamp",
			chordProgression: "i-iv-i-iv",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: ""
		},
		{
			name: "stay with me",
			chordProgression: "i-VI-III",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: "a pop-y, emo minor progression"
		},
		{
			name: "just like fire",
			chordProgression: "i-VI-III-iv",
			scale: "minor",
			matchRomanNumeralsExactly: true,
			description: "stay with me, but sinking into a iv rather than resolving"
		}
	]
};

const jazzyProgressions: ProgressionGroup = {
	name: "Jazzy progressions",
	description: "Progressions that are jazzy",
	progressions: [
		{
			name: "neo-soul",
			chordProgression: "IV-iii-vi-ii",
			scale: "major",
			description: ""
		},
		{
			name: "jazz ii-V-I",
			chordProgression: ["ii-bii-I", "ii-bII-I", "ii-V-I"],
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "roxanne",
			chordProgression: "ii-V-I-IV",
			scale: "major",
			matchRomanNumeralsExactly: true,
			description: "resolves the ii-V-I, then keeps moving with a plagal IV"
		},
		{
			name: "jazz doo wop",
			chordProgression: "I-vi-ii-V",
			scale: "major",
			description: ""
		},
		{
			name: "jazz changes (diatonic)",
			chordProgression: "vi-ii-V-I",
			scale: "major",
			description: ""
		},
		{
			name: "jazz changes (dominant-y)",
			chordProgression: [
				// with the III
				"III-VI-II-V",
				"III-VI-II-V-I",
				// without the III
				"VI-II-V-I",
				// with the 1 as the starting chord:
				"I-III-VI-II-V",
				"I-VI-II-V"
			],
			scale: "major",
			description: ""
		},
		{
			name: "ii-V vamp",
			chordProgression: "ii-V-ii-V",
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
			name: "i want you to stay",
			chordProgression: "I-ii-vi-IV",
			scale: "major",
			description:
				"wonderfully complex, you can sort of think of I-ii and vi-IV as two inverted flavors of the same movement"
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
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description:
				"TODO: try to match just IV-iv? (often I only arrives in a subsequent section)"
		},
		{
			name: "creep",
			chordProgression: "I-III-IV",
			scale: "major",
			matchRomanNumeralsExactly: true,
			minimumContiguousMatches: BACK_TO_BACK_REPEAT,
			description: ""
		},
		{
			name: "if i aint got you",
			chordProgression: "IV-iii-ii-I",
			scale: "major",
			description: ""
		}
	]
};

export type CoreProgression = {
	name: string;
	chordProgression: string | string[];
	scale: ScaleName;
	description: string;
	technicalNotes?: string;
	matchRomanNumeralsExactly?: boolean;
	minimumContiguousMatches?: number;
};

export const allProgressionGroups: ProgressionGroup[] = [
	happyMajoryProgressions,
	fourFiveVampProgressions,
	axisOfAwesomeProgressions,
	minoryProgressions,
	jazzyProgressions,
	emoPopProgressions
];

const TABLEAU10_COLORS = [
	"#4e79a7",
	"#f28e2c",
	"#e15759",
	"#76b7b2",
	"#59a14f",
	"#edc948",
	"#b07aa1",
	"#ff9da7",
	"#9c755f",
	"#bab0ac"
] as const;

export const UNGROUPED_PROGRESSION_GROUP_COLOR = "#52525b";
export const UNGROUPED_PROGRESSION_GROUP_LABEL = "no core match";

export const progressionGroupColorByName = new Map(
	allProgressionGroups.map((group, index) => [
		group.name,
		TABLEAU10_COLORS[index % TABLEAU10_COLORS.length]
	])
);

export const colorForProgressionGroupName = (
	groupName: string | null
): string =>
	groupName === null
		? UNGROUPED_PROGRESSION_GROUP_COLOR
		: (progressionGroupColorByName.get(groupName) ??
			UNGROUPED_PROGRESSION_GROUP_COLOR);

export type ProgressionGroupLegendItem = { label: string; color: string };

export const progressionGroupLegendItems: ProgressionGroupLegendItem[] = [
	...allProgressionGroups.map((group) => ({
		label: group.name,
		color: colorForProgressionGroupName(group.name)
	})),
	{
		label: UNGROUPED_PROGRESSION_GROUP_LABEL,
		color: UNGROUPED_PROGRESSION_GROUP_COLOR
	}
];

const coreProgressions: CoreProgression[] = allProgressionGroups.flatMap(
	(group) => group.progressions
);

export const progressionsThatDidntMatchAnything: CoreProgression[] = [];

export default coreProgressions;

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
			name: "I-IV vamp",
			chordProgression: "I-IV-I-IV",
			scale: "major",
			description: ""
		},
		{
			name: "I-V vamp",
			chordProgression: "I-V-I-V",
			scale: "major",
			description: ""
		},
		{
			name: "Cheerleader (verse)",
			chordProgression: "I-V-IV",
			scale: "major",
			description: ""
		},
		{
			name: "Cheerleader (chorus)",
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
			description: "Sweet Home Alabama... can also be thought of as a V-IV-I"
		} // also could be thought of as a V-IV-I
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
			chordProgression: ["I-V-vi-IV", "I-V-vi"],
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
			name: "minor-y", // TODO: better name
			chordProgression: "i-VII-v-VI",
			scale: "minor",
			description: ""
		},
		{
			name: "classic i-iv-V", // TODO: better name
			chordProgression: "i-iv-V",
			scale: "minor",
			description: ""
		},
		{
			name: "gangnam verse i-iv-v",
			chordProgression: "i-iv-v",
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
			chordProgression: "IV-iii-vi-ii",
			scale: "major",
			description: ""
		},
		{
			name: "jazz ii-V-I",
			chordProgression: ["ii7-V7-Imaj7", "ii-V-I"],
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
		},
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
	chordProgression: string | string[];
	scale: ScaleName;
	description: string;
	technicalNotes?: string;
};

export const chordProgressionVariants = (
	chordProgression: string | string[]
): string[] =>
	Array.isArray(chordProgression) ? chordProgression : [chordProgression];

export const siblingVariantsForProgression = (
	progressions: readonly CoreProgression[],
	chordProgression: string
): string[] => {
	const owner = progressions.find((progression) =>
		chordProgressionVariants(progression.chordProgression).includes(
			chordProgression
		)
	);
	return owner
		? chordProgressionVariants(owner.chordProgression)
		: [chordProgression];
};

export const allProgressionGroups: ProgressionGroup[] = [
	happyMajoryProgressions,
	fourFiveVampProgressions,
	axisOfAwesomeProgressions,
	minoryProgressions,
	jazzyProgressions,
	emoPopProgressions
];

export const progressionGroupNameByChordProgression = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): [string, string] => [variant, group.name]
			)
		)
	)
);

export const coreProgressionNameByChordProgression = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): [string, string] => [variant, progression.name]
			)
		)
	)
);

export type WeightedProgression = {
	chordProgression: string;
	matchCount: number;
};

export const dominantProgressionGroupName = (
	progressions: readonly WeightedProgression[]
): string | null => {
	const totalsByGroup = progressions.reduce(
		(totals, { chordProgression, matchCount }) => {
			const groupName =
				progressionGroupNameByChordProgression.get(chordProgression);
			if (!groupName) return totals;
			return totals.set(groupName, (totals.get(groupName) ?? 0) + matchCount);
		},
		new Map<string, number>()
	);

	return (
		[...totalsByGroup.entries()].sort(
			(first, second) =>
				second[1] - first[1] || first[0].localeCompare(second[0])
		)[0]?.[0] ?? null
	);
};

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

import { formatChordName } from "../../src/chord-processing/formatChordDisplay.js";
import { parseSongTitleAndSectionLabel } from "../../src/chord-processing/songIdentity.js";
import type {
	ProgressionChordInput,
	SongInput,
	StructuredChord
} from "../../src/chord-processing/types.js";
import { FLAG_REASONS, type FlagReason } from "./assessSongKey.js";
import { formatTonality } from "./keyReviewBuildStep.js";
import type { AssessedSong } from "./keyReviewPipeline.js";
import { toPitchClass } from "./pitchClasses.js";

const MAX_QUEUE_SECTIONS = 12;
const MAX_QUEUE_CHORDS_PER_SECTION = 48;
const SCORE_DECIMALS = 3;
const SHARE_DECIMALS = 2;

export type QueueSection = {
	name: string;
	key: string;
	scale: string;
	repeats: number;
	chords: string;
	romans: string;
};

export type QueueEntry = {
	songKey: string;
	title: string;
	artist: string;
	source: string;
	url: string;
	status: string;
	labeled: string;
	labeledCapo: number;
	needsWebLookup: boolean;
	reasons: FlagReason[];
	margin: number | null;
	outOfKeyShare: number;
	candidates: { tonality: string; score: number }[];
	sections: QueueSection[];
};

const round = (value: number, decimals: number): number =>
	Number(value.toFixed(decimals));

const chordLabel = (chord: ProgressionChordInput): string =>
	formatChordName({
		rootPitchClass: toPitchClass(chord.noteName),
		suffix: chord.suffix,
		bassPitchClass: chord.bassNoteName
			? toPitchClass(chord.bassNoteName)
			: undefined
	} as StructuredChord).replace(" / ", "/");

const toQueueSection = (section: SongInput): Omit<QueueSection, "repeats"> => ({
	name:
		parseSongTitleAndSectionLabel(section.title).sectionLabel ?? section.title,
	key: section.key ?? "",
	scale: section.scale ?? "",
	chords: section.progression
		.slice(0, MAX_QUEUE_CHORDS_PER_SECTION)
		.map(chordLabel)
		.join(" "),
	romans: (section.romanTokens ?? [])
		.slice(0, MAX_QUEUE_CHORDS_PER_SECTION)
		.join(" ")
});

const collapseRepeatedSections = (
	sections: Omit<QueueSection, "repeats">[]
): QueueSection[] =>
	sections.reduce<QueueSection[]>((collapsed, section) => {
		const existing = collapsed.find(
			(candidate) => candidate.chords === section.chords
		);
		return existing
			? collapsed.map((candidate) =>
					candidate === existing
						? { ...candidate, repeats: candidate.repeats + 1 }
						: candidate
				)
			: [...collapsed, { ...section, repeats: 1 }];
	}, []);

export const toQueueEntry = ({
	snapshot,
	status,
	assessment,
	sections
}: AssessedSong): QueueEntry => ({
	songKey: snapshot.songKey,
	title: snapshot.title,
	artist: snapshot.artist,
	source: snapshot.source,
	url: snapshot.url,
	status,
	labeled: formatTonality(assessment.labeled),
	labeledCapo: snapshot.labeledCapo,
	needsWebLookup: assessment.reasons.includes(FLAG_REASONS.capoShift),
	reasons: assessment.reasons,
	margin: Number.isFinite(assessment.margin)
		? round(assessment.margin, SCORE_DECIMALS)
		: null,
	outOfKeyShare: round(assessment.outOfKeyShare, SHARE_DECIMALS),
	candidates: assessment.candidates.map((candidate) => ({
		tonality: formatTonality(candidate),
		score: round(candidate.score, SCORE_DECIMALS)
	})),
	sections: collapseRepeatedSections(sections.map(toQueueSection)).slice(
		0,
		MAX_QUEUE_SECTIONS
	)
});

const marginRank = (entry: QueueEntry): number =>
	entry.margin ?? Number.MAX_VALUE;

export const compareQueueEntries = (a: QueueEntry, b: QueueEntry): number =>
	Number(b.needsWebLookup) - Number(a.needsWebLookup) ||
	marginRank(b) - marginRank(a);

export const chunk = <T>(items: T[], size: number): T[][] =>
	Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
		items.slice(index * size, (index + 1) * size)
	);

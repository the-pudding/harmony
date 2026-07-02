import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../progressions/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import {
	findSubProgressionMatches,
	isPositionInMatch
} from "../../../chord-processing/match-chord-progressions/index.js";

export type CoreProgressionWithStats = CoreProgression & {
	matchCount: number;
	coveragePercent: number;
};

const countCoveredPositions = (
	sectionLength: number,
	matches: ReturnType<typeof findSubProgressionMatches>
): number =>
	Array.from({ length: sectionLength }, (_, position) =>
		matches.some((match) => isPositionInMatch(position, match, sectionLength))
	).filter(Boolean).length;

export function computeProgressionMatches(
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): CoreProgressionWithStats[] {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) return [];

	return coreProgressions
		.map((progression): CoreProgressionWithStats | null => {
			const parsed = romanTokensToParsedProgression(
				progression.chordProgression.split("-")
			);
			if (!parsed) return null;

			const stats = song.sections.reduce(
				(accumulator, section) => {
					const matches = findSubProgressionMatches(
						section.parsedProgression,
						parsed
					);
					return {
						matchCount: accumulator.matchCount + matches.length,
						coveredPositions:
							accumulator.coveredPositions +
							countCoveredPositions(section.parsedProgression.length, matches)
					};
				},
				{ matchCount: 0, coveredPositions: 0 }
			);

			return {
				...progression,
				matchCount: stats.matchCount,
				coveragePercent: (stats.coveredPositions / totalChords) * 100
			};
		})
		.filter(
			(match): match is CoreProgressionWithStats =>
				match !== null && match.matchCount > 0
		)
		.sort((a, b) => b.coveragePercent - a.coveragePercent);
}

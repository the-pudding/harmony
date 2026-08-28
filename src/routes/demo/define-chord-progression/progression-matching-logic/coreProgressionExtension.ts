import coreProgressionsData from "$data/core-progressions.js";
import type { CoreProgression } from "$data/core-progressions.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import { isChorusSectionLabel, type GroupedSong } from "../../../../data/songBrowser.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";
import {
	abstractProgressionKey,
	computeCoveredPositionsBySection,
	computeStatsForParsedProgression,
	MIN_PROGRESSION_OCCURRENCES,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";
import {
	isSelfRepeatingProgression,
	MAX_PROGRESSION_LENGTH,
	MIN_PROGRESSION_LENGTH
} from "./progressionConstraints.js";
import {
	claimedInstancesInSelectionOrder,
	coverageFromInstances,
	emptyCoverage,
	mergeCoverage,
	type ProgressionInstance,
	type SectionCoverage,
	type SelectionResult
} from "./greedyProgressionSelection.js";

// A core-progression winner extends by one chord when at least this share of
// its eligible claimed instances (excluding ones cut off by a section
// boundary, or whose neighbor slot a different core progression already
// claimed) agree on the same trailing chord. Real songs are messy — e.g. one
// dropped chord in an otherwise-consistent 30-instance chorus — so this is
// deliberately not 100%.
export const EXTENSION_CONSISTENCY_MIN_PERCENT = 90;

// Every registered core progression, keyed by abstract (interval + quality)
// shape starting from its own first chord — lets an extension chain that
// lands on an already-registered shape be promoted to that named entry
// instead of either declining back to the shorter winner or minting an
// anonymous duplicate.
const coreProgressionByAbstractKey = new Map<string, CoreProgression>();
for (const progression of coreProgressionsData) {
	for (const variant of chordProgressionVariants(progression.chordProgression)) {
		const parsedVariant = romanTokensToParsedProgression(
			variant.split("-"),
			progression.scale
		);
		if (!parsedVariant) continue;
		coreProgressionByAbstractKey.set(
			abstractProgressionKey(parsedVariant),
			progression
		);
	}
}

type Vote = { token: string; supportive: ProgressionInstance[] };

// The slot right after an instance's last chord, wrapping cyclically within
// the section — matching the same modulo convention getSectionMatches/
// matchPositions already use for matches that wrap around a section.
const trailingNeighborPosition = (
	song: GroupedSong,
	instance: ProgressionInstance
): number | null => {
	const section = song.sections[instance.sectionIndex];
	const sectionLength = section.parsedProgression.length;
	if (instance.positions.length >= sectionLength) return null;
	const lastPosition = Math.max(...instance.positions);
	const neighborPosition = (lastPosition + 1) % sectionLength;
	return instance.positions.includes(neighborPosition) ? null : neighborPosition;
};

const trailingVote = (
	song: GroupedSong,
	instances: readonly ProgressionInstance[],
	claimedElsewhere: SectionCoverage
): Vote | null => {
	const claimedSets = claimedElsewhere.map((positions) => new Set(positions));
	const supportiveByToken = new Map<string, ProgressionInstance[]>();
	let eligible = 0;

	for (const instance of instances) {
		const neighborPosition = trailingNeighborPosition(song, instance);
		if (neighborPosition === null) continue;
		if (claimedSets[instance.sectionIndex]?.has(neighborPosition)) continue;
		const token =
			song.sections[instance.sectionIndex].romanTokens[neighborPosition];
		if (!token) continue;

		eligible += 1;
		const withNeighbor: ProgressionInstance = {
			...instance,
			positions: [...instance.positions, neighborPosition]
		};
		const bucket = supportiveByToken.get(token);
		if (bucket) bucket.push(withNeighbor);
		else supportiveByToken.set(token, [withNeighbor]);
	}

	if (eligible === 0) return null;

	let best: Vote | null = null;
	for (const [token, supportive] of supportiveByToken) {
		if (!best || supportive.length > best.supportive.length) {
			best = { token, supportive };
		}
	}
	if (!best) return null;

	const supportPercent = (best.supportive.length / eligible) * 100;
	if (supportPercent < EXTENSION_CONSISTENCY_MIN_PERCENT) return null;
	if (best.supportive.length < MIN_PROGRESSION_OCCURRENCES) return null;
	return best;
};

type ExtensionOutcome = {
	tokens: string[];
	instances: ProgressionInstance[];
};

// Stats derived directly from the decided instances, not an independent
// rescan — an unconstrained rescan (like core progressions use) could find
// more occurrences than were actually reserved in runningCoverage, and a
// gap-constrained rescan against runningCoverage would find none at all
// (the pattern's own first chords are exactly what's already claimed there).
// Either mismatch lets this entry's reported coverage overlap with a sibling
// entry's, summing past 100%.
const statsFromInstances = (
	song: GroupedSong,
	tokens: string[],
	instances: readonly ProgressionInstance[]
): { matchCount: number; chorusMatchCount: number; coveragePercent: number } => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	const coveredPositions = instances.length * tokens.length;
	const chorusMatchCount = instances.filter((instance) =>
		isChorusSectionLabel(song.sections[instance.sectionIndex].label)
	).length;
	return {
		matchCount: instances.length,
		chorusMatchCount,
		coveragePercent: totalChords === 0 ? 0 : (coveredPositions / totalChords) * 100
	};
};

// Extends one chord at a time while the consistency check keeps holding, only
// keeping a round if it covers strictly more chords than the un-extended
// original — checked against that fixed original baseline every round, so a
// chain can never end up worse than leaving the bare core progression alone.
const extendOneWinner = (
	song: GroupedSong,
	winner: ProgressionWithMatchStats,
	initialInstances: readonly ProgressionInstance[],
	claimedElsewhere: SectionCoverage
): ExtensionOutcome | null => {
	const originalTokens = winner.chordProgression.split("-");

	// Only 3-chord winners are eligible to extend. A 3-chord progression is
	// the shortest unit the matcher considers, so there's a real prior that
	// it's an artificially-truncated prefix of a more natural longer idea
	// (that's the whole reason this feature exists). A 4+-chord progression
	// is already a complete, well-formed unit — pushing it further tends to
	// just pick up incidental turnaround material (see "Forever Young",
	// where axis of awesome, I-V-vi-IV, got shredded into I-V-vi-IV-V-ii
	// plus a leftover fragment instead of just repeating cleanly).
	if (originalTokens.length !== MIN_PROGRESSION_LENGTH) return null;

	const originalTotal = initialInstances.length * originalTokens.length;

	let tokens = originalTokens;
	let instances: ProgressionInstance[] = [...initialInstances];
	let extendedAtLeastOnce = false;

	while (tokens.length < MAX_PROGRESSION_LENGTH) {
		const vote = trailingVote(song, instances, claimedElsewhere);
		if (!vote) break;

		// A cyclic progression's trailing chord tends to be its own tonic once it
		// loops back to repeat — that's the loop restarting, not a genuinely
		// longer unit. The adjacent-instance self-claim check below catches this
		// when repeats are back-to-back, but not when a variation (like a
		// different turnaround) breaks up the adjacency, so this needs its own
		// guard: never extend into a chord that matches where the progression
		// itself already started.
		if (vote.token === tokens[0]) break;

		const candidateTokens = [...tokens, vote.token];
		if (isSelfRepeatingProgression(candidateTokens.join("-"))) break;

		const extendedTotal = vote.supportive.length * candidateTokens.length;
		if (extendedTotal <= originalTotal) break;

		tokens = candidateTokens;
		instances = vote.supportive;
		extendedAtLeastOnce = true;
	}

	return extendedAtLeastOnce ? { tokens, instances } : null;
};

export type CoreProgressionExtensionResult = {
	coreSelected: ProgressionWithMatchStats[];
	extended: ProgressionWithMatchStats[];
	coverage: SectionCoverage;
};

// Runs once, after core selection finishes and before gap-fill candidates are
// generated: a registered core progression is often just the shortest shared
// prefix of a longer repeating unit (e.g. "stay with me" = i-VI-III is a
// prefix of the 4-chord i-VI-III-iv cycle "Just Like Fire" actually repeats).
// Winners are processed sequentially, threading a running coverage forward, so
// two winners can't both claim the same contested neighbor slot — whichever is
// processed first wins it, the second correctly abstains on that instance.
export const extendCoreProgressionsPastPrefix = (
	song: GroupedSong,
	coreSelection: SelectionResult
): CoreProgressionExtensionResult => {
	const claimedInstances = claimedInstancesInSelectionOrder(
		song,
		coreSelection.selected,
		emptyCoverage(song)
	);

	const coreSelected: ProgressionWithMatchStats[] = [];
	const extended: ProgressionWithMatchStats[] = [];
	let runningCoverage = coreSelection.coverage;

	coreSelection.selected.forEach((winner, index) => {
		const outcome = extendOneWinner(
			song,
			winner,
			claimedInstances[index],
			runningCoverage
		);
		if (!outcome) {
			coreSelected.push(winner);
			return;
		}

		const chordProgression = outcome.tokens.join("-");
		const parsed = romanTokensToParsedProgression(outcome.tokens, winner.scale);
		if (!parsed) {
			coreSelected.push(winner);
			return;
		}

		const registered = coreProgressionByAbstractKey.get(
			abstractProgressionKey(parsed)
		);
		if (registered) {
			// The chain rediscovered an already-registered, longer core
			// progression under a different name (e.g. a 3-chord winner
			// chaining into the shape of a registered 4-chord vamp) —
			// promote to that named entry, computed with normal unconstrained
			// core semantics, instead of either declining back to the shorter
			// winner or minting an anonymous duplicate.
			const registeredExact = registered.matchRomanNumeralsExactly ?? false;
			const registeredStats = computeStatsForParsedProgression(
				song,
				parsed,
				registeredExact
			);
			coreSelected.push({
				...registered,
				chordProgression,
				parsedProgression: parsed,
				matchCount: registeredStats.matchCount,
				chorusMatchCount: registeredStats.chorusMatchCount,
				coveragePercent: registeredStats.coveragePercent,
				...matchHighlightForCoreProgression(
					true,
					chordProgression,
					registered.name
				)
			});

			const claimedSets = runningCoverage.map((positions) => new Set(positions));
			const newPositionsOnly = computeCoveredPositionsBySection(
				song,
				parsed,
				registeredExact
			).map((positions, sectionIndex) =>
				positions.filter((position) => !claimedSets[sectionIndex]?.has(position))
			);
			runningCoverage = mergeCoverage(runningCoverage, newPositionsOnly);
			return;
		}

		const stats = statsFromInstances(song, outcome.tokens, outcome.instances);

		extended.push({
			name: "",
			chordProgression,
			parsedProgression: parsed,
			scale: winner.scale,
			description: "",
			matchCount: stats.matchCount,
			chorusMatchCount: stats.chorusMatchCount,
			coveragePercent: stats.coveragePercent,
			matchRomanNumeralsExactly: winner.matchRomanNumeralsExactly,
			...matchHighlightForCoreProgression(false, chordProgression, "")
		});

		// Merge in only the genuinely new positions (the added neighbor chords) —
		// outcome.instances' footprint also re-includes the winner's own original
		// 3-chord claim, which is already present in runningCoverage from
		// coreSelection.coverage. mergeCoverage doesn't deduplicate, so merging
		// the full footprint would double-count those original positions and
		// inflate downstream coverage percentages past 100%.
		const claimedSets = runningCoverage.map((positions) => new Set(positions));
		const newPositionsOnly = coverageFromInstances(song, outcome.instances).map(
			(positions, sectionIndex) =>
				positions.filter((position) => !claimedSets[sectionIndex]?.has(position))
		);
		runningCoverage = mergeCoverage(runningCoverage, newPositionsOnly);
	});

	return { coreSelected, extended, coverage: runningCoverage };
};

<script lang="ts">
	import CodeReference from "./CodeReference.svelte";
	import SectionStartBiasModal from "./SectionStartBiasModal.svelte";
	import {
		MIN_PROGRESSION_OCCURRENCES,
		MIN_FULL_SECTION_OCCURRENCES
	} from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT } from "../progression-matching-logic/greedyProgressionSelection.js";
	import {
		MIN_PROGRESSION_LENGTH,
		MAX_PROGRESSION_LENGTH
	} from "../progression-matching-logic/progressionConstraints.js";
	import { BACK_TO_BACK_REPEAT } from "$data/core-progressions.js";
	import type { SongBiasOverride } from "../compute-coverage-of-all-songs/index.js";

	type Props = { biasOverrides: SongBiasOverride[] };
	let { biasOverrides }: Props = $props();

	let showBiasModal = $state(false);
</script>

<div class="criteria-tables">
	<table class="criteria-table">
		<thead>
			<tr>
				<th>Criterion</th>
				<th>Source in code</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>
					Between <span class="const-value">{MIN_PROGRESSION_LENGTH}</span> and
					<span class="const-value">{MAX_PROGRESSION_LENGTH}</span> chords, inclusive
				</td>
				<td>
					<CodeReference
						filename="progressionConstraints.ts"
						symbols={["MIN_PROGRESSION_LENGTH", "MAX_PROGRESSION_LENGTH"]}
					/>
				</td>
			</tr>
			<tr>
				<td>
					Does not repeat a consecutive pattern of
					<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>+ chords
					within itself
				</td>
				<td>
					<CodeReference
						filename="progressionConstraints.ts"
						symbols={["isSelfRepeatingProgression"]}
					/>
				</td>
			</tr>
			<tr>
				<td>
					Appears at least
					<span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span> times
					in the song — or at least
					<span class="const-value">{MIN_FULL_SECTION_OCCURRENCES}</span> time if
					that single match fills an entire section (core progressions only)
				</td>
				<td>
					<CodeReference
						filename="progressionMatchAnalysis.ts"
						symbols={[
							"MIN_PROGRESSION_OCCURRENCES",
							"MIN_FULL_SECTION_OCCURRENCES",
							"fullyCoversAnySection",
							"computeStatsForParsedProgression"
						]}
					/>
				</td>
			</tr>
			<tr>
				<td>
					A core progression carrying a minimum-contiguous-matches setting
					additionally needs at least one run of that many occurrences sitting
					immediately back-to-back inside a single section. All
					<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>-chord core
					progressions require
					<span class="const-value">{BACK_TO_BACK_REPEAT}</span>, since a shape
					that short turns up twice somewhere in almost any song by coincidence
					— repeating right after itself is what makes it a real loop rather
					than a greedy misfire
				</td>
				<td>
					<CodeReference
						filename="core-progressions.ts"
						symbols={["minimumContiguousMatches", "BACK_TO_BACK_REPEAT"]}
					/>
					<CodeReference
						filename="progressionMatchAnalysis.ts"
						symbols={["songMeetsContiguityRequirement", "longestContiguousRun"]}
					/>
				</td>
			</tr>
			<tr>
				<td>Adjacent repeated chords are ignored</td>
				<td>
					<CodeReference
						filename="build-songs.js"
						symbols={["progressionChordInputsAreEqual"]}
					/>
				</td>
			</tr>
			<tr>
				<td>
					Bare triad chords in a core progression match any voicing of that
					function (extensions and slash bass ignored). If the core progression
					specifies an extension or slash bass on a chord, that detail must
					match exactly — so I-Imaj7 stays two chords and only matches when the
					maj7 is present
				</td>
				<td>
					<CodeReference
						filename="collapsedProgression.ts"
						symbols={[
							"matchProgressionSelectiveExactness",
							"isLiberalMatchingChord",
							"collapseMatchingTemplates"
						]}
					/>
				</td>
			</tr>
			<tr>
				<td>
					Consecutive repeats of a bare-triad chord (once extensions and slash
					bass are ignored, e.g. I·Isus2·V·Vsus4) collapse to a single chord for
					matching, so they read as I·V rather than I·Isus2·V·Vsus4. Exact
					extension chords do not collapse into a neighboring bare triad.
				</td>
				<td>
					<CodeReference
						filename="collapsedProgression.ts"
						symbols={[
							"matchProgressionSelectiveExactness",
							"collapseAdjacentCanonical"
						]}
					/>
				</td>
			</tr>
		</tbody>
	</table>

	<section class="overlap-section" aria-labelledby="overlap-criteria-heading">
		<h3 id="overlap-criteria-heading" class="overlap-heading">
			Non-overlap rules
		</h3>
		<p class="overlap-description">
			No chord position is ever claimed by more than one selected progression.
		</p>
		<table class="criteria-table overlap-table">
			<thead>
				<tr>
					<th>Criterion</th>
					<th>Source in code</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>
						Occurrences are counted as non-overlapping matches within each
						section
					</td>
					<td>
						<CodeReference
							filename="progressionMatchAnalysis.ts"
							symbols={["toNonOverlappingMatches"]}
						/>
					</td>
				</tr>
				<tr>
					<td>
						Core progressions are greedily selected; no two selected core
						progressions share a chord position
					</td>
					<td>
						<CodeReference
							filename="greedyProgressionSelection.ts"
							symbols={["greedilySelectProgressions"]}
						/>
						<CodeReference
							filename="coreProgressionSelection.ts"
							symbols={["selectCoreProgressions"]}
						/>
					</td>
				</tr>
				<tr>
					<td>
						Colliding with an earlier pick does not disqualify a progression.
						Every greedy round re-scores each remaining candidate against the
						chords that are still free, and the winner claims only its complete
						instances that fit there — so a progression owning a whole chorus
						still gets it even if one stray instance elsewhere overlaps the
						round-one winner
					</td>
					<td>
						<CodeReference
							filename="greedyProgressionSelection.ts"
							symbols={["greedilySelectProgressions", "progressionInstances"]}
						/>
					</td>
				</tr>
				<tr>
					<td>
						The recurrence bar above is re-applied to whatever survives, not
						just to the raw song: a candidate still needs
						<span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span>
						instances in the free space — or
						<span class="const-value">{MIN_FULL_SECTION_OCCURRENCES}</span> that fills
						a whole section, core progressions only. A progression whose matches are
						all consumed except one leftover fragment is dropped rather than credited
						for that fragment. The back-to-back requirement is re-applied the same
						way, so a candidate whose only contiguous run was claimed by an earlier
						pick is dropped even if scattered occurrences survive
					</td>
					<td>
						<CodeReference
							filename="greedyProgressionSelection.ts"
							symbols={["stillEarnsItsPlace", "fillsEntireSection"]}
						/>
						<CodeReference
							filename="progressionMatchAnalysis.ts"
							symbols={["meetsContiguityRequirement"]}
						/>
					</td>
				</tr>
				<tr>
					<td>
						Within a <span class="const-value"
							>{PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT}%</span
						>
						coverage tolerance each greedy round, prefer the candidate that starts
						the most sections — since the vast majority of real progressions begin
						at the top of a section
						<button
							class="bias-songs-btn"
							onclick={() => (showBiasModal = true)}
							disabled={biasOverrides.length === 0}
						>
							{biasOverrides.length === 0
								? "loading…"
								: `${biasOverrides.length} override${biasOverrides.length === 1 ? "" : "s"} in corpus`}
						</button>
					</td>
					<td>
						<CodeReference
							filename="greedyProgressionSelection.ts"
							symbols={[
								"PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT",
								"greedilySelectProgressions",
								"progressionInstances"
							]}
						/>
					</td>
				</tr>
				<tr>
					<td>
						Gap-fill candidates must recur at least
						<span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span> times as
						complete instances lying entirely outside chords already covered by core
						progressions
					</td>
					<td>
						<CodeReference
							filename="gapFillProgressionAnalysis.ts"
							symbols={["computeGapFillProgressionMatches"]}
						/>
						<CodeReference
							filename="progressionMatchAnalysis.ts"
							symbols={["computeGapOnlyStats", "isMatchFullyOutsideCoverage"]}
						/>
					</td>
				</tr>
				<tr>
					<td>
						Selected gap progressions are also pairwise non-overlapping;
						highlights replay the selection order so each progression shows only
						the chord positions it actually claimed on its turn
					</td>
					<td>
						<CodeReference
							filename="finalProgressionSelection.ts"
							symbols={[
								"selectFinalProgressions",
								"buildFinalChordAnnotations"
							]}
						/>
						<CodeReference
							filename="greedyProgressionSelection.ts"
							symbols={["claimedPositionsInSelectionOrder"]}
						/>
						<CodeReference
							filename="progressionMatchAnalysis.ts"
							symbols={["buildColoredHighlightSegments"]}
						/>
					</td>
				</tr>
			</tbody>
		</table>
	</section>
</div>

{#if showBiasModal}
	<SectionStartBiasModal
		{biasOverrides}
		onclose={() => (showBiasModal = false)}
	/>
{/if}

<style>
	.criteria-tables {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.criteria-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		color: #a1a1aa;
		line-height: 1.5;
	}

	.criteria-table th {
		text-align: left;
		font-weight: 600;
		color: #71717a;
		padding: 0.5rem 0.75rem 0.5rem 0;
		border-bottom: 1px solid #27272a;
	}

	.criteria-table th:last-child,
	.criteria-table td:last-child {
		padding-right: 0;
		color: #71717a;
	}

	.criteria-table td {
		padding: 0.5rem 0.75rem 0.5rem 0;
		border-bottom: 1px solid #27272a;
		vertical-align: top;
		color: #d4d4d8;
	}

	.criteria-table tbody tr:last-child td {
		border-bottom: none;
	}

	.overlap-section {
		padding: 0.875rem 0.875rem 0.75rem;
		border: 1px solid #3f3f46;
		border-left: 3px solid #71717a;
		border-radius: 0.375rem;
		background: #111113;
	}

	.overlap-heading {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #a1a1aa;
	}

	.overlap-description {
		margin: 0.375rem 0 0.75rem;
		font-size: 0.75rem;
		color: #71717a;
		line-height: 1.45;
	}

	.overlap-table th {
		border-bottom-color: #3f3f46;
	}

	.overlap-table td {
		border-bottom-color: #27272a;
	}

	.const-value {
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
		color: #f4f4f5;
	}

	.bias-songs-btn {
		display: inline-block;
		margin-top: 0.4rem;
		padding: 0.15rem 0.45rem;
		font-size: 0.6rem;
		font-family: inherit;
		color: rgba(251, 191, 36, 0.75);
		background: transparent;
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: 0.25rem;
		cursor: pointer;
		white-space: nowrap;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.bias-songs-btn:hover:not(:disabled) {
		color: rgba(251, 191, 36, 1);
		border-color: rgba(251, 191, 36, 0.6);
		background: rgba(251, 191, 36, 0.06);
	}

	.bias-songs-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
</style>

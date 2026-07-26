<script lang="ts">
	import CodeReference from "./CodeReference.svelte";
	import {
		MIN_PROGRESSION_OCCURRENCES,
		MIN_FULL_SECTION_OCCURRENCES
	} from "../progression-matching-logic/progressionMatchAnalysis.js";
	import {
		MIN_PROGRESSION_LENGTH,
		MAX_PROGRESSION_LENGTH
	} from "../progression-matching-logic/progressionConstraints.js";
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
					<span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span> times in
					the song — or at least
					<span class="const-value">{MIN_FULL_SECTION_OCCURRENCES}</span> time
					if that single match fills an entire section (core progressions only)
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
					Matching ignores slash bass and normalizes extensions to base quality
				</td>
				<td>
					<CodeReference
						filename="progressionMatchAnalysis.ts"
						symbols={[
							"matchProgressionIgnoringBassAndExtensions",
							"SUFFIX_TO_BASE"
						]}
					/>
				</td>
			</tr>
			<tr>
				<td>
					Consecutive repeats of a chord (once extensions and slash bass are
					ignored, e.g. I·Isus2·V·Vsus4) collapse to a single chord for
					matching, so they read as I·V rather than I·V·V
				</td>
				<td>
					<CodeReference
						filename="collapsedProgression.ts"
						symbols={["collapseAdjacentCanonical"]}
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
							symbols={["greedilySelectProgressions", "hasOverlapWithCoverage"]}
						/>
						<CodeReference
							filename="coreProgressionSelection.ts"
							symbols={["selectCoreProgressions"]}
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
						highlights show only the chord positions each selection actually
						claims
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
							symbols={["getCandidateCoverage"]}
						/>
						<CodeReference
							filename="progressionMatchAnalysis.ts"
							symbols={[
								"computeGapOnlyCoveredPositionsBySection",
								"buildColoredHighlightSegments"
							]}
						/>
					</td>
				</tr>
			</tbody>
		</table>
	</section>
</div>

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
</style>

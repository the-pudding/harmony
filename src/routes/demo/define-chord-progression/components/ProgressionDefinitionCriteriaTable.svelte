<script lang="ts">
	import { MIN_PROGRESSION_OCCURRENCES } from "../progression-matching-logic/progressionMatchAnalysis.js";
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
					<div class="code-source">
						<code class="code-file">progressionConstraints.ts</code>
						<span class="code-symbols">
							<code class="code-symbol">MIN_PROGRESSION_LENGTH</code>
							<code class="code-symbol">MAX_PROGRESSION_LENGTH</code>
						</span>
					</div>
				</td>
			</tr>
			<tr>
				<td>
					Does not repeat a consecutive pattern of
					<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>+ chords within itself
				</td>
				<td>
					<div class="code-source">
						<code class="code-file">progressionConstraints.ts</code>
						<span class="code-symbols">
							<code class="code-symbol">isSelfRepeatingProgression</code>
						</span>
					</div>
				</td>
			</tr>
			<tr>
				<td>
					Appears at least
					<span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span> times in the
					song (core matching)
				</td>
				<td>
					<div class="code-source">
						<code class="code-file">progressionMatchAnalysis.ts</code>
						<span class="code-symbols">
							<code class="code-symbol">MIN_PROGRESSION_OCCURRENCES</code>
							<code class="code-symbol">computeStatsForParsedProgression</code>
						</span>
					</div>
				</td>
			</tr>
			<tr>
				<td>Adjacent repeated chords are ignored</td>
				<td>
					<div class="code-source">
						<code class="code-file">build-songs.js</code>
						<span class="code-symbols">
							<code class="code-symbol">progressionChordInputsAreEqual</code>
						</span>
					</div>
				</td>
			</tr>
			<tr>
				<td>
					Matching ignores slash bass and normalizes extensions to base quality
				</td>
				<td>
					<div class="code-source">
						<code class="code-file">progressionMatchAnalysis.ts</code>
						<span class="code-symbols">
							<code class="code-symbol">matchProgressionIgnoringBassAndExtensions</code>
							<code class="code-symbol">SUFFIX_TO_BASE</code>
						</span>
					</div>
				</td>
			</tr>
		</tbody>
	</table>

	<section class="overlap-section" aria-labelledby="overlap-criteria-heading">
		<h3 id="overlap-criteria-heading" class="overlap-heading">Non-overlap rules</h3>
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
						Occurrences are counted as non-overlapping matches within each section
					</td>
					<td>
						<div class="code-source">
							<code class="code-file">progressionMatchAnalysis.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">toNonOverlappingMatches</code>
							</span>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						Core progressions are greedily selected; no two selected core
						progressions share a chord position
					</td>
					<td>
						<div class="code-source">
							<code class="code-file">greedyProgressionSelection.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">greedilySelectProgressions</code>
								<code class="code-symbol">hasOverlapWithCoverage</code>
							</span>
						</div>
						<div class="code-source">
							<code class="code-file">coreProgressionSelection.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">selectCoreProgressions</code>
							</span>
						</div>
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
						<div class="code-source">
							<code class="code-file">gapFillProgressionAnalysis.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">computeGapFillProgressionMatches</code>
							</span>
						</div>
						<div class="code-source">
							<code class="code-file">progressionMatchAnalysis.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">computeGapOnlyStats</code>
								<code class="code-symbol">isMatchFullyOutsideCoverage</code>
							</span>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						Selected gap progressions are also pairwise non-overlapping; highlights
						show only the chord positions each selection actually claims
					</td>
					<td>
						<div class="code-source">
							<code class="code-file">finalProgressionSelection.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">selectFinalProgressions</code>
								<code class="code-symbol">buildFinalChordAnnotations</code>
							</span>
						</div>
						<div class="code-source">
							<code class="code-file">greedyProgressionSelection.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">getCandidateCoverage</code>
							</span>
						</div>
						<div class="code-source">
							<code class="code-file">progressionMatchAnalysis.ts</code>
							<span class="code-symbols">
								<code class="code-symbol">computeGapOnlyCoveredPositionsBySection</code>
								<code class="code-symbol">buildColoredHighlightSegments</code>
							</span>
						</div>
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

	.code-source {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.code-file {
		font-size: 0.6875rem;
		font-weight: 500;
		color: #71717a;
		background: transparent;
		padding: 0;
	}

	.code-symbols {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.code-symbol {
		font-size: 0.75rem;
		font-weight: 500;
		color: #93c5fd;
		background: rgba(147, 197, 253, 0.08);
		padding: 0.05rem 0.3rem;
		border-radius: 0.2rem;
	}
</style>

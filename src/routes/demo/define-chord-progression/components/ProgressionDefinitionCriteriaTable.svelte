<script lang="ts">
	import { MIN_PROGRESSION_OCCURRENCES } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import {
		MIN_PROGRESSION_LENGTH,
		MAX_PROGRESSION_LENGTH
	} from "../progression-matching-logic/progressionConstraints.js";
</script>

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
				<span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span> times in the song
			</td>
			<td>
				<div class="code-source">
					<code class="code-file">progressionMatchAnalysis.ts</code>
					<span class="code-symbols">
						<code class="code-symbol">MIN_PROGRESSION_OCCURRENCES</code>
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

<style>
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

	.criteria-table tr:last-child td {
		border-bottom: none;
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

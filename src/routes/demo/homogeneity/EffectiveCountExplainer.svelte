<script lang="ts">
	import {
		effectiveCountForShares,
		HOMOGENEITY_BANDS,
		homogeneityBandFor
	} from "../shared/progressionHomogeneity.js";
	import DataTable from "./DataTable.svelte";
	import { formatEffectiveCount } from "./homogeneityFormat.js";

	const EXAMPLE_SPLITS: number[][] = [
		[100],
		[50, 50],
		[25, 25, 25, 25],
		[90, 10],
		[70, 20, 10],
		[40, 40, 20]
	];

	const [FIRST_BAND, SECOND_BAND] = HOMOGENEITY_BANDS;

	const HEADERS = ["Split of matched chords", "Distinct", "Effective"];
	const MIN_TABLE_WIDTH = "22rem";

	const sumOf = (values: readonly number[]): number =>
		values.reduce((total, value) => total + value, 0);

	const examples = EXAMPLE_SPLITS.map((split) => {
		const total = sumOf(split);
		const effectiveCount = effectiveCountForShares(split.map((part) => part / total));
		return {
			label: split.map((part) => `${part}%`).join(" / "),
			distinctCount: split.length,
			effectiveCount,
			bandColor: homogeneityBandFor(effectiveCount).color
		};
	});
</script>

<div class="explainer">
	<div class="explainer-text">
		<h3 class="explainer-title">What are effective progressions?</h3>
		<p>
			<code>1 / Σ share²</code>, where each share is a matched progression's fraction of the
			song's matched chords (core and gap-fill alike; unmatched chords are ignored). It reads as
			"this song is as varied as N equally-used progressions".
		</p>
		<p>
			It's fractional because it weights each progression by how much of the song it covers
			instead of just counting them. It's only a whole number when every progression is used
			equally, so a 90/10 song counts as ≈1.2: really one loop plus a brief bridge, which the
			plain distinct count would call 2.
		</p>
		<p>
			This is the inverse Simpson index (ecology's "effective number of species"). Bands round
			it: {FIRST_BAND.shortLabel} is anything under {FIRST_BAND.upperBound}, {SECOND_BAND.shortLabel}
			is {FIRST_BAND.upperBound}–{SECOND_BAND.upperBound}, and so on.
		</p>
	</div>

	<DataTable headers={HEADERS} minWidth={MIN_TABLE_WIDTH}>
		{#each examples as example (example.label)}
			<tr>
				<td class="numeric nowrap">{example.label}</td>
				<td class="numeric">{example.distinctCount}</td>
				<td class="numeric nowrap">
					<span class="band-dot" style:background={example.bandColor}></span>
					<span class="strong">{formatEffectiveCount(example.effectiveCount)}</span>
				</td>
			</tr>
		{/each}
	</DataTable>
</div>

<style>
	.explainer {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
		gap: 1.5rem;
		align-items: start;
		padding: 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
	}

	.explainer-text {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #a1a1aa;
	}

	.explainer-text p {
		margin: 0;
	}

	.explainer-title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	code {
		font-family: inherit;
		color: #f4f4f5;
	}
</style>

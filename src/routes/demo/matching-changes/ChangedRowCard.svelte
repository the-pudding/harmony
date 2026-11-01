<script lang="ts">
	import { buildDefineChordProgressionSongUrl } from "../shared/defineChordProgressionSongUrl.js";
	import {
		exampleDetails,
		formatBeforeAfter,
		formatRowChangeLabel,
		formatRowDelta,
		formatSongTitle,
		rowDeltaDirection,
		type RowVariant
	} from "./formatChange.js";
	import type { ChangedRow } from "./matchingChangeReport.js";

	type Props = {
		row: ChangedRow;
		variant: RowVariant;
	};

	const { row, variant }: Props = $props();

	const direction = $derived(rowDeltaDirection(row));
</script>

<li class="row-card">
	<div class="row-header">
		<span class="row-name">{row.name}</span>
		<span class="row-counts">{formatBeforeAfter(row)}</span>
		<span class="row-delta {direction}">{formatRowDelta(row)}</span>
		<span class="row-percent {direction}"
			>{formatRowChangeLabel(row, variant)}</span
		>
	</div>
	<ul class="examples">
		{#each row.examples as example (example.songKey)}
			<li class="example">
				<a
					class="example-link"
					href={buildDefineChordProgressionSongUrl(example.songKey)}
					target="_blank"
					rel="noopener">{formatSongTitle(example)}</a
				>
				{#each exampleDetails(example, variant) as detail (detail)}
					<span class="example-detail">{detail}</span>
				{/each}
			</li>
		{/each}
	</ul>
</li>

<style>
	.row-card {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.7);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.row-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.8125rem;
	}

	.row-name {
		flex: 1;
		min-width: 8rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.row-counts {
		color: #a1a1aa;
	}

	.up {
		color: #86efac;
	}

	.down {
		color: #fca5a5;
	}

	.flat {
		color: #71717a;
	}

	.examples {
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.example {
		list-style: none;
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.75rem;
	}

	.example-link {
		color: #a5b4fc;
		text-decoration: none;
	}

	.example-link:hover {
		text-decoration: underline;
	}

	.example-detail {
		color: #71717a;
	}
</style>

<script lang="ts">
	import {
		colorForProgressionGroupName,
		UNGROUPED_PROGRESSION_GROUP_LABEL
	} from "$data/core-progressions.js";
	import type { ArtistSummary } from "./artistStats.js";

	const PERCENT_DECIMALS = 0;

	type Props = {
		summary: ArtistSummary;
		layout?: "row" | "column";
	};

	const { summary, layout = "row" }: Props = $props();

	const yearRangeLabel = $derived(
		summary.firstYear === null || summary.lastYear === null
			? "—"
			: summary.firstYear === summary.lastYear
				? `${summary.firstYear}`
				: `${summary.firstYear}–${summary.lastYear}`
	);

	const facts = $derived([
		{ label: "songs", value: summary.songCount.toLocaleString() },
		{ label: "years", value: yearRangeLabel },
		{
			label: "core matched",
			value: `${summary.coreMatchedPercent.toFixed(PERCENT_DECIMALS)}%`
		},
		{
			label: "avg coverage",
			value: `${summary.averageCoveragePercent.toFixed(PERCENT_DECIMALS)}%`
		}
	]);
</script>

<dl class="facts" class:facts-column={layout === "column"}>
	{#each facts as fact (fact.label)}
		<div class="fact">
			<dt>{fact.label}</dt>
			<dd>{fact.value}</dd>
		</div>
	{/each}
	<div class="fact">
		<dt>dominant group</dt>
		<dd>
			<span
				class="group-dot"
				style:background={colorForProgressionGroupName(
					summary.dominantGroupName
				)}
			></span>
			{summary.dominantGroupName ?? UNGROUPED_PROGRESSION_GROUP_LABEL}
		</dd>
	</div>
</dl>

<style>
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		margin: 0;
		font-size: 0.7rem;
	}

	.facts-column {
		flex-direction: column;
		gap: 0.25rem;
	}

	.fact {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.facts-column .fact {
		justify-content: space-between;
	}

	.fact dt {
		color: #71717a;
	}

	.fact dd {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: #e4e4e7;
	}

	.group-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>

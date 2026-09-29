<script module lang="ts">
	export type StackedSegment = {
		id: string;
		label: string;
		color: string;
		sharePercent: number;
	};

	export type DecadeStack = {
		decade: number;
		songCount: number;
		segments: StackedSegment[];
	};
</script>

<script lang="ts">
	import ChartHeader from "./ChartHeader.svelte";

	type Props = {
		title: string;
		description?: string;
		stacks: DecadeStack[];
	};

	const { title, description, stacks }: Props = $props();

	const SEGMENT_LABEL_MIN_PERCENT = 8;
	const TOOLTIP_DECIMAL_PLACES = 1;

	const legendSegments = $derived(stacks[0]?.segments ?? []);

	const segmentTooltip = (stack: DecadeStack, segment: StackedSegment): string =>
		`${stack.decade}s · ${segment.label}: ${segment.sharePercent.toFixed(TOOLTIP_DECIMAL_PLACES)}% of ${stack.songCount.toLocaleString()} songs`;
</script>

<div class="chart-block">
	<ChartHeader {title} {description} />

	<div class="legend">
		{#each legendSegments as segment (segment.id)}
			<span class="legend-item">
				<span class="legend-swatch" style:background={segment.color}></span>
				{segment.label}
			</span>
		{/each}
	</div>

	<div class="columns">
		{#each stacks as stack (stack.decade)}
			<div class="column">
				<div class="stack">
					{#each stack.segments as segment (segment.id)}
						<div
							class="segment"
							style:height="{segment.sharePercent}%"
							style:background={segment.color}
							title={segmentTooltip(stack, segment)}
						>
							{#if segment.sharePercent >= SEGMENT_LABEL_MIN_PERCENT}
								{Math.round(segment.sharePercent)}%
							{/if}
						</div>
					{/each}
				</div>
				<span class="decade-label">{stack.decade}s</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.chart-block {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.875rem;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7rem;
		color: #d4d4d8;
	}

	.legend-swatch {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.columns {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
		height: 16rem;
	}

	.column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.stack {
		flex: 1;
		display: flex;
		flex-direction: column-reverse;
		overflow: hidden;
		border-radius: 0.125rem;
	}

	.segment {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #09090b;
	}

	.decade-label {
		text-align: center;
		font-size: 0.65rem;
		color: #71717a;
	}
</style>

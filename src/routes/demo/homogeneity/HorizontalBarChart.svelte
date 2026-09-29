<script module lang="ts">
	export type HorizontalBar = {
		label: string;
		color: string;
		sharePercent: number;
		songCount: number;
	};
</script>

<script lang="ts">
	import ChartHeader from "./ChartHeader.svelte";

	type Props = {
		title: string;
		description?: string;
		bars: HorizontalBar[];
	};

	const { title, description, bars }: Props = $props();

	const PERCENT_DECIMAL_PLACES = 1;
	const FULL_WIDTH_PERCENT = 100;

	const maxSharePercent = $derived(Math.max(...bars.map((bar) => bar.sharePercent), 0));

	const widthPercentFor = (sharePercent: number): number =>
		maxSharePercent === 0 ? 0 : (sharePercent / maxSharePercent) * FULL_WIDTH_PERCENT;
</script>

<div class="chart-block">
	<ChartHeader {title} {description} />

	<div class="bars">
		{#each bars as bar (bar.label)}
			<div class="bar-row">
				<span class="bar-label">{bar.label}</span>
				<div class="bar-track">
					<div
						class="bar-fill"
						style:width="{widthPercentFor(bar.sharePercent)}%"
						style:background={bar.color}
					></div>
				</div>
				<span class="bar-value">
					<span class="bar-percent">{bar.sharePercent.toFixed(PERCENT_DECIMAL_PLACES)}%</span>
					· {bar.songCount.toLocaleString()}
				</span>
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

	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.bar-row {
		display: grid;
		grid-template-columns: 7rem 1fr 7.5rem;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.7rem;
	}

	.bar-label {
		color: #d4d4d8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-track {
		height: 0.875rem;
		border-radius: 0.125rem;
		background: #18181b;
	}

	.bar-fill {
		height: 100%;
		border-radius: 0.125rem;
	}

	.bar-value {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: #a1a1aa;
	}

	.bar-percent {
		font-weight: 600;
		color: #f4f4f5;
	}
</style>

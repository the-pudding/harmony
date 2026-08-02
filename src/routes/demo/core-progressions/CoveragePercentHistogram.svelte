<script lang="ts">
	import { bin, scaleLinear } from "d3";

	const BIN_COUNT = 10;
	const MARGIN_LEFT = 0;
	const MARGIN_RIGHT = 0;
	const MARGIN_TOP = 2;
	const MARGIN_BOTTOM = 0;
	const HEIGHT = 28;
	const BAR_FILL = "#6366f1";

	type Props = {
		values: number[];
	};

	const { values }: Props = $props();

	let containerWidth = $state(0);

	const plotWidth = $derived(Math.max(containerWidth - MARGIN_LEFT - MARGIN_RIGHT, 0));
	const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

	const histogramBins = $derived.by(() => {
		if (values.length === 0 || plotWidth <= 0) return [];
		return bin<number, number>()
			.domain([0, 100])
			.thresholds(BIN_COUNT)(values);
	});

	const maxCount = $derived(
		histogramBins.reduce((peak, b) => Math.max(peak, b.length), 1)
	);

	const xScale = $derived(scaleLinear().domain([0, 100]).range([0, plotWidth]));
	const yScale = $derived(scaleLinear().domain([0, maxCount]).range([plotHeight, 0]));
</script>

<div class="histogram" bind:clientWidth={containerWidth}>
	{#if histogramBins.length > 0 && plotWidth > 0}
		<svg width={containerWidth} height={HEIGHT} role="img" aria-label="Coverage percent distribution">
			<g transform="translate({MARGIN_LEFT}, {MARGIN_TOP})">
				{#each histogramBins as bucket (bucket.x0)}
					<rect
						x={xScale(bucket.x0 ?? 0)}
						y={yScale(bucket.length)}
						width={Math.max(xScale(bucket.x1 ?? 100) - xScale(bucket.x0 ?? 0) - 1, 0)}
						height={Math.max(plotHeight - yScale(bucket.length), 0)}
						fill={BAR_FILL}
						opacity="0.8"
					/>
				{/each}
			</g>
		</svg>
	{/if}
</div>

<style>
	.histogram {
		width: 100%;
		min-width: 0;
	}
</style>

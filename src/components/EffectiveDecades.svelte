<script>
	import raw from "$data/charts/effective-progressions-by-decade.csv";
	import { HOMOGENEITY_BANDS } from "$routes/demo/shared/progressionHomogeneity";
	import _ from "lodash";

	const colorFor = (label) =>
		HOMOGENEITY_BANDS.find((b) => b.label === label)?.color;

	const rows = raw.map((d) => ({
		...d,
		songCount: +d.songCount,
		sharePercent: +d.sharePercent,
		decadeSongCount: +d.decadeSongCount,
		color: colorFor(d.label)
	}));

	const decades = Object.entries(_.groupBy(rows, "decade")).map(
		([decade, segments]) => ({
			decade,
			segments
		})
	);
	const legend = decades[0].segments;
</script>

<figure id="effective-decades">
	<h3 class="chart-title">Songs by effective progression count, by decade</h3>

	<div class="legend">
		{#each legend as { band, label, color } (band)}
			<span class="legend-item">
				<span class="swatch" style:background={color}></span>
				{label}
			</span>
		{/each}
	</div>

	<div class="columns">
		{#each decades as { decade, segments } (decade)}
			<div class="column">
				<div class="stack">
					{#each segments as { band, label, sharePercent, songCount, decadeSongCount, color } (band)}
						<div
							class="segment"
							class:highlight={band === "≈1"}
							style:height="{sharePercent}%"
							style:background={color}
							title="{decade}s · {label}: {sharePercent.toFixed(
								1
							)}% ({songCount} of {decadeSongCount} songs)"
						>
							{#if sharePercent >= 8}{Math.round(sharePercent)}%{/if}
						</div>
					{/each}
				</div>
				<span class="decade">{decade}s</span>
			</div>
		{/each}
	</div>
</figure>

<style>
	figure {
		max-width: 700px;
		margin: 2rem auto;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
		font-size: var(--14px);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
	}

	.columns {
		display: flex;
		gap: 0.5rem;
		height: 20rem;
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
		border-radius: 2px;
	}

	.segment.highlight {
		box-shadow: inset 0 0 0 4px var(--color-fg);
	}

	.segment {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--12px);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: black;
	}

	.decade {
		text-align: center;
		font-size: var(--14px);
		opacity: 0.6;
	}
</style>

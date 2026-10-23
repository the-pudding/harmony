<script>
	import raw from "$data/charts/effective-progressions.csv";
	import { HOMOGENEITY_BANDS } from "$routes/demo/shared/progressionHomogeneity";

	const colorFor = (label) =>
		HOMOGENEITY_BANDS.find((b) => b.label === label)?.color;

	const data = raw.map((d) => ({
		...d,
		songCount: +d.songCount,
		sharePercent: +d.sharePercent,
		color: colorFor(d.label)
	}));

	const max = Math.max(...data.map((d) => d.sharePercent));
</script>

<figure id="effective-bar">
	<h3 class="chart-title">Songs by effective progression count</h3>

	<div class="bars">
		{#each data as { band, label, songCount, sharePercent, color } (band)}
			<div class="row">
				<span class="label">{label}</span>
				<div class="track">
					<div
						class="fill"
						style:width="{(sharePercent / max) * 100}%"
						style:background={color}
					></div>
				</div>
				<span class="value">
					<strong>{sharePercent.toFixed(1)}%</strong>
					<span class="songs">({songCount.toLocaleString()} songs)</span>
				</span>
			</div>
		{/each}
	</div>
</figure>

<style>
	figure {
		max-width: 700px;
		margin: 2rem auto;
	}

	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: 9rem 1fr 7.5rem;
		align-items: center;
		gap: 0.75rem;
		font-size: var(--14px);
	}

	.label {
		white-space: nowrap;
	}

	.track {
		height: 1.25rem;
	}

	.fill {
		height: 100%;
		border-radius: 2px;
	}

	.value {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.songs {
		opacity: 0.6;
	}
</style>

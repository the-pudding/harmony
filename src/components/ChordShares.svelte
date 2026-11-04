<script>
	import raw from "$data/charts/chord-shares.csv";
	import {
		paletteById,
		styleOf
	} from "$routes/demo/design/chord-viz/chordPalettes.js";
	import ProgressionShareBar from "$routes/demo/harmony-map/components/ProgressionShareBar.svelte";

	const FEATURED = ["I", "IV", "V"];
	// How many of the biggest other chords get their name on the bar (each
	// hides when its sliver gets too narrow for it).
	const NAMED_OTHER_COUNT = 5;
	const palette = paletteById("journey-from-home");

	const percentByChord = new Map(raw.map((d) => [d.chord, +d.percent]));

	// Biggest first, like the gray slivers after them. Named on the bar,
	// with just the percent under it.
	const featured = FEATURED.map((chord) => {
		const percent = percentByChord.get(chord) ?? 0;
		const { fill, text } = styleOf(palette, "major", chord).colors;
		return {
			name: chord,
			percent,
			color: fill,
			labelText: `${Math.round(percent)}%`,
			barLabel: chord,
			barLabelColor: text
		};
	}).sort((a, b) => b.percent - a.percent);
	const featuredPercent = featured.reduce((sum, d) => sum + d.percent, 0);

	// Every other chord as its own gray sliver, biggest first; only the
	// first few are named, on the bar.
	const segments = [
		...featured,
		...raw
			.filter((d) => !FEATURED.includes(d.chord))
			.map((d, i) => ({
				name: d.chord,
				percent: +d.percent,
				color: "var(--color-gray-600)",
				labeled: false,
				barLabel: i < NAMED_OTHER_COUNT ? d.chord : undefined,
				barLabelColor: "var(--color-fg)"
			}))
	];
</script>

<figure id="chord-shares">
	<div class="chart-title">51% of all chords used are I, IV or V</div>

	<div class="bar">
		<ProgressionShareBar {segments} labelRowCount={1} />
	</div>
</figure>

<style>
	figure {
		max-width: var(--col-width);
		padding: 1rem 2rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.bar {
		--bar-height: 1.5rem;
		--label-size-px: 12px;
		--track-color: transparent;
		font-family: var(--font-mono);
	}

	/* The slivers fill the whole bar, so let them give up the room the gaps
	   between them take instead of pushing the smallest off the end. */
	.bar :global(.segment) {
		flex-shrink: 1;
	}
</style>

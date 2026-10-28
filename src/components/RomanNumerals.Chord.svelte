<script>
	import { getContext, untrack } from "svelte";
	import Chord from "$components/Chord.svelte";

	let {
		degree,
		roman,
		tonality = "major",
		letter,
		marker,
		symbols = "chords"
	} = $props();

	const slides = getContext("state");
	const slide = $derived(slides?.slideI);

	// a click shows the other face; entering any slide resets to that slide's `symbols`
	let flipped = $state(false);
	const showNumeral = $derived((symbols === "numerals") !== flipped);

	// entering numerals from a chords slide waits a beat; everything else is immediate
	let prevSymbols = untrack(() => symbols);
	let delayFlip = $state(false);
	$effect.pre(() => {
		slide;
		flipped = false;
		delayFlip = prevSymbols === "chords" && symbols === "numerals";
		prevSymbols = symbols;
	});

	// seconds; I flips first, then ii, iii… each a bit later
	const FLIP_DELAY = 2;
	const FLIP_STAGGER = 0.3;

	// watercolor filters are costly, so only mount them once they're first needed
	let numeralMounted = $state(false);
	$effect(() => {
		if (showNumeral) numeralMounted = true;
	});
</script>

<button
	class="card"
	class:numeral={showNumeral}
	style:transition-delay={delayFlip && showNumeral
		? `${FLIP_DELAY + (degree - 1) * FLIP_STAGGER}s`
		: null}
	aria-label="{showNumeral ? roman : `${letter}${marker}`}, click to flip"
	onclick={() => {
		delayFlip = false;
		flipped = !flipped;
	}}
>
	<span class="face name" aria-hidden="true"
		><span class="letter">{letter}</span><span class="marker">{marker}</span
		></span
	>
	<span class="face watercolor" aria-hidden="true">
		{#if numeralMounted}
			<Chord chord={degree} {tonality} />
		{/if}
	</span>
</button>

<style>
	.card {
		display: grid;
		width: 100%;
		height: 100%;
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		transform-style: preserve-3d;
		transform: perspective(600px) rotateY(180deg);
		transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.card:hover {
		background: none;
		color: inherit;
	}

	.card.numeral {
		transform: perspective(600px) rotateY(0deg);
	}
	.face {
		grid-area: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		backface-visibility: hidden;
	}

	/* pre-turned so it faces out when the card is at 180° */
	.name {
		transform: rotateY(180deg);
		white-space: nowrap;
	}

	.letter {
		font-weight: bold;
	}

	.marker {
		font-size: 0.58em;
		opacity: 0.6;
	}

	.watercolor :global(svg) {
		width: 100%;
		height: 100%;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>

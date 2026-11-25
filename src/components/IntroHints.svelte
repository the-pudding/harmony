<script lang="ts">
	import { untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { fade } from "svelte/transition";
	import { audio } from "$runes/audio.svelte";
	import PointerIcon from "$components/PointerIcon.svelte";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";

	// Callouts for slide 0: delayed on the first visit, immediate on returns;
	// dismissed on leaving (the audio one also on touching the mute toggle).
	let { slideI }: { slideI: number } = $props();

	const FIRST_VISIT_DELAY_MS = 3000;

	const touch = new MediaQuery("(pointer: coarse)", false);

	let ready = $state(false);
	let audioTouched = $state(false);
	// Not reactive: only read when a visit starts.
	let shownBefore = false;
	let mutedAtVisit = audio.muted;

	const onFirstSlide = $derived(slideI === 0);
	const showNext = $derived(ready && onFirstSlide);
	const showAudio = $derived(showNext && !audioTouched);

	$effect(() => {
		if (!onFirstSlide) return;
		mutedAtVisit = untrack(() => audio.muted);
		const timer = setTimeout(
			() => {
				ready = true;
				shownBefore = true;
			},
			shownBefore ? 0 : FIRST_VISIT_DELAY_MS
		);
		return () => {
			clearTimeout(timer);
			ready = false;
			audioTouched = false;
		};
	});

	// the mute toggle is the only thing that changes this on slide 0
	$effect(() => {
		if (onFirstSlide && audio.muted !== mutedAtVisit) audioTouched = true;
	});
</script>

{#if showNext}
	<!-- sits under the next tab (Tap.svelte), which a click on is the step -->
	<div class="hint next" transition:fade={{ duration: 400 }}>
		<span class="nav-cue-body">
			<span class="nav-cue-row">
				<strong>{touch.current ? "Tap" : "Click"} to continue with audio</strong>
				<span class="nav-cue-icon"><PointerIcon /></span>
			</span>
			{#if !touch.current}
				<span class="nav-keys">
					Or use the keyboard
					<span class="key"><ChevronLeft /></span>
					<span class="key"><ChevronRight /></span>
				</span>
			{/if}
		</span>
	</div>
{/if}

{#if showAudio}
	<div class="hint audio" transition:fade={{ duration: 400 }}>
		<div class="bubble">Psst, there’s gonna be sound. Toggle it off here</div>
	</div>
{/if}

<style>
	.hint {
		position: fixed;
		z-index: calc(var(--z-overlay) + 1);
		pointer-events: none;
		font-family: var(--font-sans);
	}

	.bubble {
		position: relative;
		line-height: 1.35;
		text-wrap: balance;
	}

	.bubble::after {
		content: "";
		position: absolute;
		width: 0.625rem;
		height: 0.625rem;
		background: inherit;
		border: inherit;
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
	}

	/* under the next tab (Tap.svelte: centered on the viewport's height, 3.5rem
	   tall), right-aligned a little in from the edge */
	.next {
		--art-pointer-fill: #fff;
		--art-pointer-tick: #f368ff;
		--art-pointer-ink: #000;
		top: calc(50% + 2rem);
		right: 0.75rem;
		width: max-content;
		max-width: min(70%, calc(100vw - 1.5rem));
		font-weight: 700;
		text-align: right;
		color: #fff;
		text-shadow: 0 0 6px rgb(0 0 0 / 0.8);
	}

	.nav-cue-body {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		-webkit-font-smoothing: antialiased;
	}

	.nav-cue-body strong {
		font-size: 1rem;
		line-height: 1.1;
	}

	@media (min-width: 40rem) {
		.nav-cue-body strong {
			font-size: 1.5rem;
		}
	}

	.nav-cue-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.nav-cue-icon :global(svg) {
		width: 1.5rem;
		height: auto;
	}

	.nav-keys {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
	}

	.nav-keys .key {
		display: flex;
		padding: 4px;
		border-radius: 2px;
		background: #fff;
	}

	.nav-keys .key :global(svg) {
		width: 0.625rem;
		height: 0.625rem;
		stroke: #222;
		stroke-width: 5px;
	}

	/* above the mute toggle (2.5rem square, 1rem from the corner) */
	.audio {
		right: 1rem;
		bottom: calc(1rem + 2.5rem + 0.75rem);
		max-width: min(13rem, calc(100vw - 2rem));
	}

	.audio .bubble {
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgb(24 24 27 / 0.78);
		backdrop-filter: blur(8px);
		border: 1px solid var(--color-gray-700);
		color: var(--color-gray-300);
		font-size: 0.8125rem;
	}

	.audio .bubble::after {
		bottom: -0.34rem;
		right: 0.875rem;
		rotate: 45deg;
		background: rgb(24 24 27 / 0.9);
		border: 0;
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
		border-right: 1px solid var(--color-gray-700);
	}

</style>

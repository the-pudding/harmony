<script lang="ts">
	import { untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { fade } from "svelte/transition";
	import { audio } from "$runes/audio.svelte";

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
	<div class="hint next" transition:fade={{ duration: 400 }}>
		<div class="bubble">
			{touch.current
				? "Tap the left/right side of the screen to advance"
				: "Click or use left/right arrow keys to advance"}
		</div>
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

	/* points at the next arrow's icon: its center is 14px above the viewport's
	   middle and 40px in from the right edge (Tap.svelte's 64px target) */
	.next {
		--icon-center-y: calc(50% - 14px);
		--icon-center-from-right: 40px;
		top: var(--icon-center-y);
		right: calc(64px + 0.25rem);
		translate: 0 -50%;
		max-width: min(15rem, calc(100vw - 64px - 2rem));
	}

	.next .bubble {
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		background: var(--color-purple);
		color: #fff;
		font-size: 0.9375rem;
		font-weight: 600;
		box-shadow:
			0 0 0 1px rgb(255 255 255 / 0.18) inset,
			0 6px 24px color-mix(in srgb, var(--color-purple) 55%, transparent);
		animation: nudge 1.6s ease-in-out infinite;
	}

	.next .bubble::after {
		top: 50%;
		right: -0.3125rem;
		rotate: -45deg;
		translate: 0 -50%;
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
		border: 0;
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

	/* narrow screens: the dot and its label sit mid-screen, so go above the arrow */
	@media (max-width: 600px) {
		.next {
			top: auto;
			translate: none;
			right: 0.75rem;
			bottom: calc(50% + 3.5rem);
		}

		.next .bubble {
			animation-name: nudge-down;
		}

		.next .bubble::after {
			top: auto;
			bottom: -0.3125rem;
			right: calc(var(--icon-center-from-right) - 0.75rem - 0.3125rem);
			translate: none;
			rotate: 45deg;
		}
	}

	@keyframes nudge-down {
		50% {
			transform: translateY(4px);
		}
	}

	@keyframes nudge {
		50% {
			transform: translateX(4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.next .bubble {
			animation: none;
		}
	}
</style>

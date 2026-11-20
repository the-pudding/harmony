<script lang="ts">
	import { MediaQuery } from "svelte/reactivity";
	import { fade } from "svelte/transition";
	import { audio } from "$runes/audio.svelte";

	// Two callouts for the very first slide: one pointing at the "next"
	// arrow, a quieter one at the mute toggle. They fade in a few seconds
	// after the slide shows, and go away when the reader moves on (for good:
	// they've found the arrows) or, for the audio one, when they touch the
	// mute toggle. Neither catches clicks.
	let { slideI }: { slideI: number } = $props();

	const SHOW_AFTER_MS = 3000;

	// Touch screens have no arrow keys, and tap the screen's sides instead.
	const touch = new MediaQuery("(pointer: coarse)", false);

	let ready = $state(false);
	let left = $state(false);
	let audioTouched = $state(false);

	const onFirstSlide = $derived(slideI === 0);
	const showNext = $derived(ready && onFirstSlide && !left);
	const showAudio = $derived(showNext && !audioTouched);

	$effect(() => {
		if (!onFirstSlide) {
			left = true;
			ready = false;
			return;
		}
		if (left) return;
		const timer = setTimeout(() => (ready = true), SHOW_AFTER_MS);
		return () => clearTimeout(timer);
	});

	// the mute toggle is the only thing that changes this on slide 0
	let mutedAtStart = audio.muted;
	$effect(() => {
		if (audio.muted !== mutedAtStart) audioTouched = true;
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

	/* the pointer, a rotated square behind the bubble's edge */
	.bubble::after {
		content: "";
		position: absolute;
		width: 0.625rem;
		height: 0.625rem;
		background: inherit;
		border: inherit;
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
	}

	/* purple, pointing right at the next arrow (a 64px target at the edge) */
	.next {
		top: 50%;
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

	/* quieter: frosted and neutral, above the mute toggle (2.5rem square,
	   1rem from the corner), pointing down at it */
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

	/* narrow screens: the dot and its label sit mid-screen, so the callout
	   goes above the arrow and points down at it */
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
			right: calc(32px - 0.75rem - 0.3125rem);
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

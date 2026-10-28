<script>
	import { base } from "$app/paths";
	import { audio } from "$runes/audio.svelte";
	import { flip } from "svelte/animate";
	import { fade } from "svelte/transition";
	import { cubicInOut } from "svelte/easing";
	import Circle from "$components/RomanNumerals.Circle.svelte";
	import { romanTokensToProgressionInKey } from "../chord-processing/scales.js";
	import {
		MAJOR,
		MINOR
	} from "../chord-processing/chord-classifier/fuzzySuffixMap.js";

	let {
		keys = ["C"],
		symbols = "chords",
		labelHome = true,
		progression = ["I", "V", "vi", "IV"]
	} = $props();

	// copy.json passes "false" as a string
	const showHome = $derived(labelHome !== false && labelHome !== "false");

	const SUFFIX_LABELS = { [MAJOR]: "", [MINOR]: "m" };

	// ms for a circle to move between layouts (e.g. 3 → 1)
	const MOVE_DURATION = 600;

	const chordsInKey = (key) =>
		romanTokensToProgressionInKey(progression, key, "major")
			.map(
				({ noteName, suffix }) =>
					`${noteName}${SUFFIX_LABELS[suffix] ?? suffix}`
			)
			.join("-");

	// chords in the recordings are evenly spaced; tweak to line up with the audio
	const CHORD_DURATION = 1.48;
	// lead-in before the first chord
	const CHORD_OFFSET = 0;

	let playingKey = $state(null);
	let playTime = $state(null);

	// created on first play rather than in markup, so hydration/re-renders
	// never reset src mid-play
	const audioByKey = new Map();

	const audioFor = (key) => {
		const src = `${base}/assets/audio/progression/${key}_${progression.join("-")}.mp3`;
		let el = audioByKey.get(src);
		if (!el) {
			el = new Audio(src);
			el.muted = audio.muted;
			el.onended = () => {
				if (playingKey === key) playingKey = null;
			};
			audioByKey.set(src, el);
		}
		return el;
	};

	const stopAll = () =>
		audioByKey.forEach((el) => {
			el.pause();
			el.currentTime = 0;
		});

	// one progression at a time; clicking the playing one stops it
	const toggle = (key) => {
		stopAll();
		if (playingKey === key) {
			playingKey = null;
			return;
		}
		playingKey = key;
		audioFor(key)
			.play()
			.catch(() => {
				if (playingKey === key) playingKey = null;
			});
	};

	// follow the global mute toggle, including mid-play
	$effect(() => {
		const { muted } = audio;
		audioByKey.forEach((el) => (el.muted = muted));
	});

	// track the playing audio's clock so its circle can animate in time
	$effect(() => {
		if (!playingKey) return;
		const el = audioFor(playingKey);
		let frame;
		const tick = () => {
			playTime = el.currentTime - CHORD_OFFSET;
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => {
			cancelAnimationFrame(frame);
			playTime = null;
		};
	});

	$effect(() => stopAll);
</script>

<figure
	id="roman-numerals"
	style:--cols={Math.min(keys.length, 2)}
	style:--rows={Math.ceil(keys.length / 2)}
>
	<!-- keyed so a circle that stays between slides moves/scales to its new spot -->
	{#each keys as key (key)}
		<div
			class="circle-wrapper"
			animate:flip={{ duration: MOVE_DURATION, easing: cubicInOut }}
			in:fade={{ duration: 300, delay: MOVE_DURATION / 2 }}
			out:fade={{ duration: 200 }}
		>
			<Circle
				{key}
				{symbols}
				labelHome={showHome}
				{progression}
				playTime={playingKey === key ? playTime : null}
				chordDuration={CHORD_DURATION}
			/>
			<button
				class="progression chords"
				aria-pressed={playingKey === key}
				onclick={() => toggle(key)}
			>
				<svg class="icon" viewBox="0 0 10 10" aria-hidden="true">
					{#if playingKey === key}
						<rect x="1.5" y="1.5" width="7" height="7" />
					{:else}
						<path d="M2 1 L9 5 L2 9 Z" />
					{/if}
				</svg>
				{chordsInKey(key)}
			</button>
		</div>
	{/each}
</figure>

<style>
	figure {
		--gap: 3rem;
		--label: 1.5rem;
		container-type: size;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-content: center;
		gap: var(--gap);
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		margin: 0;
		padding: 1.5rem 0;
	}

	.circle-wrapper {
		--size: min(
			400px,
			(100cqw - (var(--cols) - 1) * var(--gap)) / var(--cols),
			(100cqh - (var(--rows) - 1) * var(--gap)) / var(--rows) - var(--label)
		);
		width: var(--size);
		height: calc(var(--size) + var(--label));
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.progression {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		font-family: var(--font-mono);
		font-size: var(--12px);
		padding: 0.375rem 0.5rem;
	}

	.icon {
		width: 0.75em;
		height: 0.75em;
		fill: currentColor;
	}</style>

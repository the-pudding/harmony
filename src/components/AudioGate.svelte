<script>
	import { audio } from "$runes/audio.svelte";
	import { getContext } from "svelte";

	// Two buttons for the text: play with sound, or stay muted. "Start with
	// audio" also plays the slide's first playable song, which shows what
	// clicking a dot does. Neither moves to another slide.
	const explore = getContext("explore");

	// Whether a choice was made; which one then follows the mute toggle, so
	// the buttons never disagree with it.
	let chosen = $state(false);
	const withAudio = $derived(chosen && !audio.muted);
	const muted = $derived(chosen && audio.muted);

	const startWithAudio = () => {
		chosen = true;
		audio.muted = false;
		const songKey = explore.firstPlayableSongKey;
		if (songKey) explore.playSong(songKey);
	};

	const stayMuted = () => {
		chosen = true;
		audio.muted = true;
	};
</script>

<div class="buttons">
	<button class="audio" aria-pressed={withAudio} onclick={startWithAudio}>
		Start with audio
	</button>
	<button class="muted" aria-pressed={muted} onclick={stayMuted}>
		Stay muted
	</button>
</div>

<style>
	.buttons {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.buttons button {
		font-size: inherit;
	}

	.buttons button[aria-pressed="true"] {
		background: var(--color-fg);
		color: var(--color-bg);
		border-color: var(--color-fg);
	}
</style>

<script lang="ts">
	import type { DesignSong } from "./designSongs.js";

	type Props = {
		song: DesignSong;
		paused: boolean;
		onTogglePlayback: () => void;
		onRestart: () => void;
	};

	let { song, paused, onTogglePlayback, onRestart }: Props = $props();

	const playLabel = $derived(
		paused ? `Play ${song.title} by ${song.artist}` : `Pause ${song.title}`
	);
</script>

<article class="card">
	<button
		type="button"
		class="play-button"
		aria-label={playLabel}
		onclick={onTogglePlayback}
	>
		{#if paused}
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path d="M8 5v14l11-7z" /></svg
			>
		{:else}
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg
			>
		{/if}
	</button>
	<button
		type="button"
		class="restart-button"
		aria-label="Play {song.title} from the start"
		title="Play from start"
		onclick={onRestart}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true"
			><path d="M6 5h2v14H6zM9.5 12 18 5v14z" /></svg
		>
	</button>
	<div class="meta">
		<span class="title">{song.title}</span>
		<span class="artist">{song.artist} · {song.year}</span>
	</div>
</article>

<style>
	.card {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		width: fit-content;
		min-width: 16rem;
		padding: 0.75rem 1rem 0.75rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.play-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		border: none;
		border-radius: 9999px;
		background: #6366f1;
		color: #f4f4f5;
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.15s ease;
	}

	.play-button:hover {
		background: #818cf8;
		transform: scale(1.06);
	}

	.restart-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		margin-left: -0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 9999px;
		background: transparent;
		color: #a1a1aa;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.restart-button:hover {
		color: #f4f4f5;
		border-color: #818cf8;
	}

	.play-button svg {
		width: 1.125rem;
		height: 1.125rem;
		fill: currentColor;
	}

	.restart-button svg {
		width: 0.875rem;
		height: 0.875rem;
		fill: currentColor;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.artist {
		font-size: 0.75rem;
		color: #a1a1aa;
	}
</style>

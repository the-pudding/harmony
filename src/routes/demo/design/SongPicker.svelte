<script lang="ts">
	import type { SyncedSongAudio } from "$data/syncedSongs.js";

	type Props = {
		options: SyncedSongAudio[];
		songKey: string | undefined;
		labelOf: (option: SyncedSongAudio) => string;
		onSelect: (songKey: string) => void;
	};

	let { options, songKey, labelOf, onSelect }: Props = $props();
</script>

<label class="song-picker">
	<span class="label">Song</span>
	<select
		value={songKey}
		onchange={(event) => onSelect(event.currentTarget.value)}
	>
		{#each options as option (option.songKey)}
			<option value={option.songKey}>{labelOf(option)}</option>
		{/each}
	</select>
</label>

<style>
	.song-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.label {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	select {
		padding: 0.375rem 0.625rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
	}
</style>

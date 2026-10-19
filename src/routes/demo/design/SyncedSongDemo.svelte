<script lang="ts">
	import { committedSyncedSongs } from "$data/syncedSongs.js";
	import SongPicker from "./SongPicker.svelte";
	import SyncedSongPlayer from "./SyncedSongPlayer.svelte";
	import { songKeyLabel } from "./designSongs.js";
	import { createSongSelection } from "./songSelection.svelte.js";

	const syncedSongs = Object.values(committedSyncedSongs)
		.map(({ songKey, audioFile }) => ({ songKey, audioFile }))
		.sort((a, b) => a.songKey.localeCompare(b.songKey));

	const selection = createSongSelection(() => syncedSongs);
</script>

<div class="demo">
	{#if syncedSongs.length === 0}
		<p class="message">
			No synced songs yet. Record one in the Record sync tab and save it.
		</p>
	{:else}
		<SongPicker
			options={syncedSongs}
			songKey={selection.selectedSongKey}
			labelOf={(option) => songKeyLabel(option.songKey)}
			onSelect={selection.select}
		/>
		{#if selection.loadError}
			<p class="message error">{selection.loadError}</p>
		{:else if selection.song}
			{#key selection.song.songKey}
				<SyncedSongPlayer
					song={selection.song}
					committedFile={committedSyncedSongs[selection.song.songKey]}
				/>
			{/key}
		{:else}
			<p class="message">Loading…</p>
		{/if}
	{/if}
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.message {
		margin: 0;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.message.error {
		color: #fca5a5;
	}
</style>

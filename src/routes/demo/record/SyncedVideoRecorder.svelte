<script lang="ts">
	import {
		committedSyncedVideos,
		SYNCED_VIDEO_DATA_DIRECTORY,
		SYNCED_VIDEO_DIRECTORY,
		syncedVideos,
		type SyncedSongFile
	} from "$data/syncedSongs.js";
	import SyncedSongPlayer from "./SyncedSongPlayer.svelte";
	import { loadRecordVideo, type RecordSong } from "./recordSongs.js";

	let videoId = $state(syncedVideos[0]?.videoId);
	let song = $state.raw<RecordSong | null>(null);
	let loadError = $state("");
	// Saved this session, before the data module reloads with them.
	let savedFiles = $state.raw<Record<string, SyncedSongFile>>({});

	const video = $derived(syncedVideos.find((d) => d.videoId === videoId));

	$effect(() => {
		const picked = video;
		song = null;
		loadError = "";
		if (!picked) return;
		let isCurrent = true;
		loadRecordVideo(picked)
			.then((loaded) => {
				if (isCurrent) song = loaded;
			})
			.catch((error: unknown) => {
				if (isCurrent)
					loadError = error instanceof Error ? error.message : String(error);
			});
		return () => {
			isCurrent = false;
		};
	});
</script>

<div class="recorder">
	<div class="how-to">
		<p class="how-to-heading">How to record a synced video</p>
		<ol>
			<li>
				Add the video at
				<code>static/{SYNCED_VIDEO_DIRECTORY}/{"{video id}"}.mp4</code> and list
				it, with its song and cluster, in <code>syncedVideos</code> in
				<code>src/data/syncedSongs.ts</code>.
			</li>
			<li>
				Record it like a synced song (see the <em>Record audio</em> tab): check the key,
				set the region, and play along on a MIDI keyboard. Chord times are
				seconds into the video.
			</li>
			<li>
				<strong>Save</strong> writes
				<code>{SYNCED_VIDEO_DATA_DIRECTORY}/{"{video id}"}.json</code>, which
				the story's Video component reads. It doesn't touch
				<code>reference.csv</code>.
			</li>
		</ol>
	</div>

	{#if syncedVideos.length > 1}
		<select aria-label="Video" bind:value={videoId}>
			{#each syncedVideos as option (option.videoId)}
				<option value={option.videoId}>{option.videoId}</option>
			{/each}
		</select>
	{/if}

	{#if loadError}
		<p class="message error">{loadError}</p>
	{:else if song?.videoId}
		{#key song.videoId}
			<SyncedSongPlayer
				{song}
				committedFile={savedFiles[song.videoId] ??
					committedSyncedVideos[song.videoId]}
				onSaved={(file) =>
					(savedFiles = { ...savedFiles, [song!.videoId!]: file })}
				editing
			/>
		{/key}
	{:else if video}
		<p class="message">Loading…</p>
	{:else}
		<p class="message">No synced videos listed yet.</p>
	{/if}
</div>

<style>
	.recorder {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.how-to {
		max-width: 48rem;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.75rem;
		line-height: 1.6;
		color: #a1a1aa;
	}

	.how-to-heading {
		margin: 0 0 0.375rem;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	ol {
		margin: 0;
		padding-left: 1.25rem;
	}

	strong,
	em {
		color: #f4f4f5;
	}

	code {
		color: #d4d4d8;
	}

	select {
		align-self: flex-start;
		padding: 0.375rem 0.625rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: rgba(24, 24, 27, 0.6);
		color: #f4f4f5;
		font: inherit;
		font-size: 0.75rem;
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

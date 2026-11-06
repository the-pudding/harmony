<script>
	import SyncedChords from "$components/SyncedChords.svelte";
	import {
		committedSyncedSongs,
		featuredSyncedSongs as reference
	} from "$data/syncedSongs";
	import { audio } from "$runes/audio.svelte";

	let { cluster, playingSongKey = $bindable() } = $props();

	let audioEls = $state({});
	let currentTime = $state(0);
	const songs = $derived(
		reference
			.filter((d) => d.cluster === cluster)
			.map((d) => ({ ...d, data: committedSyncedSongs[d.songKey] }))
	);
	const currentSong = $derived(songs.find((d) => d.songKey === playingSongKey));
	const currentTimeData = $derived(currentSong?.data?.chords);
	const songKeySignature = $derived(currentSong?.data?.key);

	const playFromStart = (song) => {
		const audioEl = audioEls[song.songKey];
		audioEl.currentTime = song.startSeconds;
		currentTime = song.startSeconds;
		audioEl.play();
	};

	const playCurrentSong = () => {
		for (const song of songs) {
			const audioEl = audioEls[song.songKey];
			if (!audioEl) continue;
			if (song.songKey === playingSongKey) {
				playFromStart(song);
			} else {
				audioEl.pause();
				audioEl.currentTime = song.startSeconds;
			}
		}
	};

	const step = (dir) => {
		const i = songs.findIndex((d) => d.songKey === playingSongKey);
		const next = songs[(i + dir + songs.length) % songs.length];

		if (next.songKey === playingSongKey) playFromStart(next);
		else playingSongKey = next.songKey;
	};

	const playNext = () => step(1);
	const playPrev = () => step(-1);

	const stopAtEnd = (song) => {
		const audioEl = audioEls[song.songKey];
		if (song.songKey !== playingSongKey) return;
		if (audioEl.currentTime >= song.endSeconds) {
			audioEl.pause();
			playNext();
		}
	};

	$effect(playCurrentSong);

	$effect(() => {
		const audioEl = audioEls[playingSongKey];
		if (!audioEl) return;
		let frame;
		const tick = () => {
			currentTime = audioEl.currentTime;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="player">
	<div class="header">
		{#if songs.length > 1}
			<button aria-label="Previous song" onclick={playPrev}>&larr;</button>
		{/if}
		<div class="name">{cluster}</div>
		{#if songs.length > 1}
			<button aria-label="Next song" onclick={playNext}>&rarr;</button>
		{/if}
	</div>
	<SyncedChords {cluster} chords={currentTimeData} {currentTime} />

	{#each songs as song (song.songKey)}
		<audio
			bind:this={audioEls[song.songKey]}
			src={`assets/audio/synced-songs/${song.songKey}.mp3`}
			muted={audio.muted}
			ontimeupdate={() => stopAtEnd(song)}
			onended={playNext}
		></audio>
	{/each}
</div>

<style>
	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.name {
		font-family: var(--font-serif);
		font-size: var(--32px);
	}

</style>

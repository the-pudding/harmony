<script>
	import progressionsData from "$data/charts/top-progressions.csv";
	import { chordify } from "$utils/chordify";
	import reference from "$data/synced-songs/reference.csv";

	let { cluster, playingSongKey = $bindable() } = $props();

	const songs = $derived(reference.filter((d) => d.cluster === cluster));

	let audioEls = $state({});

	const playFromStart = (song) => {
		const audioEl = audioEls[song.songKey];
		audioEl.currentTime = song.startSeconds;
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

	const playNext = () => {
		const i = songs.findIndex((d) => d.songKey === playingSongKey);
		const next = songs[(i + 1) % songs.length];

		if (next.songKey === playingSongKey) playFromStart(next);
		else playingSongKey = next.songKey;
	};

	const stopAtEnd = (song) => {
		const audioEl = audioEls[song.songKey];
		if (
			song.songKey === playingSongKey &&
			audioEl.currentTime >= song.endSeconds
		) {
			audioEl.pause();
			playNext();
		}
	};

	$effect(playCurrentSong);

	const progression = $derived(
		progressionsData.find((d) => d.name === cluster)?.chordProgression
	);
</script>

<div class="player" {@attach chordify}>
	<div class="name">{cluster}</div>
	<span class="chords">
		{progression}
	</span>

	{#each songs as song (song.songKey)}
		<audio
			bind:this={audioEls[song.songKey]}
			src={`assets/audio/synced-songs/${song.songKey}.mp3`}
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

	.name {
		font-family: var(--font-serif);
		font-size: var(--32px);
		margin-bottom: 1rem;
	}

	.chords {
		font-size: var(--40px);
	}
</style>

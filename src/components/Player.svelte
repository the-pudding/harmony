<script>
	import progressionsData from "$data/charts/top-progressions.csv";
	import { chordify } from "$utils/chordify";
	import { committedSyncedSongs } from "$data/syncedSongs";
	import reference from "$data/synced-songs/reference.csv";

	let { cluster, playingSongKey = $bindable() } = $props();

	let audioEls = $state({});
	let chordsEl = $state();
	let currentTime = $state(0);
	const songs = $derived(
		reference
			.filter((d) => d.cluster === cluster)
			.map((d) => ({ ...d, data: committedSyncedSongs[d.songKey] }))
	);
	const currentTimeData = $derived(
		songs.find((d) => d.songKey === playingSongKey)?.data?.chords
	);

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

	const playNext = () => {
		const i = songs.findIndex((d) => d.songKey === playingSongKey);
		const next = songs[(i + 1) % songs.length];

		if (next.songKey === playingSongKey) playFromStart(next);
		else playingSongKey = next.songKey;
	};

	const stopAtEnd = (song) => {
		const audioEl = audioEls[song.songKey];
		if (song.songKey !== playingSongKey) return;
		currentTime = audioEl.currentTime;
		if (audioEl.currentTime >= song.endSeconds) {
			audioEl.pause();
			playNext();
		}
	};

	const progression = $derived(
		progressionsData.find((d) => d.name === cluster)?.chordProgression
	);
	const loop = $derived(progression?.split("-").map((d) => d.trim()) ?? []);

	const activeChordIndex = $derived.by(() => {
		if (!currentTimeData || !loop.length) return null;
		let pos = 0;
		let index = null;
		for (const { seconds, roman } of currentTimeData) {
			if (seconds > currentTime) break;
			if (roman === loop[pos]) index = pos;
			else if (roman === loop[0]) index = 0;
			else {
				index = null;
				continue;
			}
			pos = (index + 1) % loop.length;
		}
		return index;
	});

	$effect(playCurrentSong);

	$effect(() => {
		chordsEl?.querySelectorAll(".chord").forEach((el, i) => {
			el.classList.toggle("playing", i === activeChordIndex);
			el.classList.toggle(
				"faded",
				activeChordIndex !== null && i !== activeChordIndex
			);
		});
	});
</script>

<div class="player" {@attach chordify}>
	<div class="name">{cluster}</div>
	<span class="chords" bind:this={chordsEl}>
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

	.chords :global(.chord) {
		transition:
			transform 150ms,
			opacity 150ms;
	}

	.chords :global(.chord.playing) {
		opacity: 1;
		transform: scale(1.3);
	}

	.chords :global(.chord.faded) {
		opacity: 0.4;
		transform: scale(1);
	}
</style>

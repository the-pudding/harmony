<script>
	import ClusterTitle from "$components/ClusterTitle.svelte";
	import {
		committedSyncedSongs,
		featuredSyncedSongs as reference
	} from "$data/syncedSongs";
	import { attachAudio, audio } from "$runes/audio.svelte";
	import progressionsData from "$data/charts/top-progressions.csv";
	import { appearanceFor } from "$routes/demo/design/chord-viz/chordAppearanceLookup.js";
	import { paletteById } from "$routes/demo/design/chord-viz/chordPalettes.js";

	let {
		cluster,
		playingSongKey = $bindable(),
		// where to draw the header and chords instead of in place, in
		// viewport pixels (top center), e.g. under the cluster on the map
		anchor = null,
		// the player's height, so its slot can keep the space while anchored
		height = $bindable(0)
	} = $props();

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

	// The clip split by which chord is playing, colored as in Chord.svelte.
	const segments = $derived.by(() => {
		const song = currentSong;
		const chords = song?.data?.chords;
		if (!song || !chords?.length) return [];
		const tonality =
			progressionsData.find((d) => d.name === cluster)?.scale ?? "major";
		const palette = paletteById("journey-from-home");
		const span = song.endSeconds - song.startSeconds;
		const fraction = (seconds) =>
			Math.min(1, Math.max(0, (seconds - song.startSeconds) / span));
		return chords.flatMap(({ seconds, roman }, i) => {
			const startFraction = fraction(seconds);
			const endFraction = fraction(chords[i + 1]?.seconds ?? song.endSeconds);
			if (endFraction <= startFraction) return [];
			const chordColor = appearanceFor(tonality, roman, palette).colors.fill;
			return [{ startFraction, endFraction, chordColor }];
		});
	});

	$effect(() => {
		audio.chordColorSegments = segments;
	});

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
		if (!audioEl) {
			audio.clipProgressFraction = 0;
			return;
		}
		let frame;
		const tick = () => {
			currentTime = audioEl.currentTime;
			audio.clipProgressFraction = currentSong
				? Math.min(
						1,
						Math.max(
							0,
							(currentTime - currentSong.startSeconds) /
								(currentSong.endSeconds - currentSong.startSeconds)
						)
					)
				: 0;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div
	class="player"
	class:anchored={anchor !== null}
	style:left={anchor ? `${anchor.x}px` : null}
	style:top={anchor ? `${anchor.y}px` : null}
	bind:clientHeight={height}
>
	<ClusterTitle
		{cluster}
		chords={currentTimeData}
		{currentTime}
		onPrev={songs.length > 1 ? playPrev : null}
		onNext={songs.length > 1 ? playNext : null}
	/>

	{#each songs as song (song.songKey)}
		<audio
			{@attach attachAudio}
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

	/* Under its cluster on the map; only the arrows take clicks, so the
	   map can still be dragged from behind it. */
	.player.anchored {
		position: fixed;
		transform: translateX(-50%);
		pointer-events: none;
	}

	.player.anchored :global(button) {
		pointer-events: auto;
	}
</style>

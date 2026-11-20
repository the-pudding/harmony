<script>
	import ClusterTitle from "$components/ClusterTitle.svelte";
	import { committedSyncedSongs } from "$data/syncedSongs";
	import {
		featuredClusterOf,
		featuredSongsOf
	} from "$data/featuredClusters.js";
	import { progressionFor } from "$data/clusterProgression.js";
	import { attachAudio, audio } from "$runes/audio.svelte";
	import { appearanceFor } from "$routes/demo/design/chord-viz/chordAppearanceLookup.js";
	import { paletteById } from "$routes/demo/design/chord-viz/chordPalettes.js";

	let {
		// Plays this cluster's featured songs...
		cluster = undefined,
		// ...or, when given, these songs instead (those that have clips), each
		// with its own featured cluster's tonality. Then `cluster` is only
		// the title's.
		songKeys = undefined,
		// Only the <audio> elements, no title, arrows or chords: the playing
		// dot's progress ring is the UI. The clip plays once and stops.
		headless = false,
		playingSongKey = $bindable(),
		// where to draw the header and chords instead of in place, in
		// viewport pixels (top center), e.g. under the cluster on the map
		anchor = null,
		// the player's height, so its slot can keep the space while anchored
		height = $bindable(0),
		// whether the playing song's full chords are open
		chordsOpen = false,
		// with this, a button under the chords opens the playing song's
		// full chords (and hides while they're open)
		onToggleChords = null
	} = $props();

	let audioEls = $state({});
	let currentTime = $state(0);
	const songs = $derived(
		(songKeys
			? songKeys.flatMap((songKey) => {
					const songCluster = featuredClusterOf(songKey);
					const row = featuredSongsOf(songCluster).find(
						(d) => d.songKey === songKey
					);
					return row ? [{ ...row, songCluster }] : [];
				})
			: featuredSongsOf(cluster).map((d) => ({ ...d, songCluster: cluster }))
		).map((d) => ({ ...d, data: committedSyncedSongs[d.songKey] }))
	);
	const currentSong = $derived(songs.find((d) => d.songKey === playingSongKey));
	const currentTimeData = $derived(currentSong?.data?.chords);

	// The clip split by which chord is playing, colored as in Chord.svelte.
	const segments = $derived.by(() => {
		const song = currentSong;
		const chords = song?.data?.chords;
		if (!song || !chords?.length) return [];
		const tonality = progressionFor(song.songCluster)?.tonality ?? "major";
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
	// A headless clip (one dot's) plays once; a cluster's player cycles.
	const advance = () => {
		if (headless) playingSongKey = undefined;
		else playNext();
	};
	const playPrev = () => step(-1);

	const stopAtEnd = (song) => {
		const audioEl = audioEls[song.songKey];
		if (song.songKey !== playingSongKey) return;
		if (audioEl.currentTime >= song.endSeconds) {
			audioEl.pause();
			advance();
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

{#snippet audios()}
	{#each songs as song (song.songKey)}
		<audio
			{@attach attachAudio}
			bind:this={audioEls[song.songKey]}
			src={`assets/audio/synced-songs/${song.songKey}.mp3`}
			ontimeupdate={() => stopAtEnd(song)}
			onended={advance}
		></audio>
	{/each}
{/snippet}

{#if headless}
	{@render audios()}
{:else}
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

		{#if onToggleChords}
			<!-- always takes its space, so nothing shifts when a song starts or
			     its chords open -->
			{@const shown = currentSong && !chordsOpen}
			<button
				class="full-chords"
				class:hidden={!shown}
				aria-hidden={!shown}
				tabindex={shown ? 0 : -1}
				onclick={() => shown && onToggleChords(currentSong.songKey)}
			>
				show full chords
			</button>
		{/if}

		{@render audios()}
	</div>
{/if}

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

	.full-chords {
		margin-top: 1.5rem;
		padding: 0.25rem 0.625rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		background: rgba(9, 9, 11, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			color 150ms ease,
			background 150ms ease,
			border-color 150ms ease;
	}

	.full-chords.hidden {
		visibility: hidden;
	}

	.full-chords:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(39, 39, 42, 0.85);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.full-chords:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}
</style>

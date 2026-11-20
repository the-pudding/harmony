<script>
	import { base } from "$app/paths";
	import { getContext, untrack } from "svelte";
	import { audio, createAudio, onStopAll } from "$runes/audio.svelte";
	import { flip } from "svelte/animate";
	import { fade } from "svelte/transition";
	import { cubicInOut } from "svelte/easing";
	import Circle from "$components/RomanNumerals.Circle.svelte";
	import SongAnchor from "$components/SongAnchor.svelte";
	import {
		committedSyncedSongs,
		SYNCED_SONG_AUDIO_DIRECTORY
	} from "$data/syncedSongs";
	import { romanTokensToProgressionInKey } from "../chord-processing/scales.js";
	import {
		MAJOR,
		MINOR
	} from "../chord-processing/chord-classifier/fuzzySuffixMap.js";

	let {
		keys = ["C"],
		symbols = "chords",
		labelHome = true,
		// put C at the top of every circle instead of each key's home chord
		sameRotation = false,
		// draw the progression's arrows in the accent color
		highlightShape = false,
		progression = ["I", "V", "vi", "IV"],
		arrivingForward = false
	} = $props();

	// copy.json passes "false" as a string
	const showHome = $derived(labelHome !== false && labelHome !== "false");
	const rotateTogether = $derived(
		sameRotation === true || sameRotation === "true"
	);
	const accentArrows = $derived(
		highlightShape === true || highlightShape === "true"
	);

	const SUFFIX_LABELS = { [MAJOR]: "", [MINOR]: "m" };

	// ms for a circle to move between layouts (e.g. 3 → 1)
	const MOVE_DURATION = 600;

	const chordsInKey = (key) =>
		romanTokensToProgressionInKey(progression, key, "major")
			.map(
				({ noteName, suffix }) =>
					`${noteName}${SUFFIX_LABELS[suffix] ?? suffix}`
			)
			.join("-");

	// A song for each key, played from its synced clip (src/data/synced-songs)
	// with the circle following its recorded chord changes.
	const SONG_BY_KEY = {
		C: {
			songKey: "the-beatles__let-it-be",
			title: "Let It Be",
			artist: "The Beatles"
		},
		E: {
			songKey: "journey__dont-stop-believin",
			title: "Don't Stop Believin'",
			artist: "Journey"
		},
		A: {
			songKey: "darius-rucker__wagon-wheel",
			title: "Wagon Wheel",
			artist: "Darius Rucker"
		}
	};

	const songFor = (key) => {
		const song = SONG_BY_KEY[key];
		const synced = song && committedSyncedSongs[song.songKey];
		return synced ? { ...song, synced } : null;
	};

	const hasSongs = $derived(keys.some((key) => songFor(key) !== null));

	// The column count that gives the biggest circles in the space there is
	// (e.g. 3 keys in one row when it's wide, stacked when it's tall). Sizes
	// mirror the CSS below: a 3rem gap, 1.5rem per label row, 1.5rem padding
	// top and bottom, and circles at most 300px.
	const MAX_CIRCLE_PX = 300;
	// Room under the song title, as a share of the circle's size: the home
	// chord's outline and "home" tag reach about 9% above the circle.
	const SONG_GAP = 0.1;
	let figureWidth = $state(0);
	let figureHeight = $state(0);
	const columns = $derived.by(() => {
		const count = keys.length;
		if (count <= 1 || figureWidth === 0 || figureHeight === 0) {
			return Math.min(count, 2);
		}
		const rem =
			typeof document === "undefined"
				? 16
				: parseFloat(getComputedStyle(document.documentElement).fontSize);
		const gap = 3 * rem;
		const labels = 1.5 * rem * (hasSongs ? 2 : 1);
		const height = figureHeight - 3 * rem;
		const sizeFor = (cols) => {
			const rows = Math.ceil(count / cols);
			return Math.min(
				MAX_CIRCLE_PX,
				(figureWidth - (cols - 1) * gap) / cols,
				((height - (rows - 1) * gap) / rows - labels) /
					(1 + (hasSongs ? SONG_GAP : 0))
			);
		};
		let best = 1;
		for (let cols = 2; cols <= count; cols++) {
			if (sizeFor(cols) > sizeFor(best)) best = cols;
		}
		return best;
	});

	// chords in the recordings are evenly spaced; tweak to line up with the audio
	const CHORD_DURATION = 1.48;
	// lead-in before the first chord
	const CHORD_OFFSET = 0;

	// What's playing: a key's progression (the key, e.g. "C") or its song
	// ("song:C").
	let playingKey = $state(null);
	let playTime = $state(null);

	const songId = (key) => `song:${key}`;

	const SONG_LABEL_PX = 14;
	// Arriving, the dots wait for the previous stage to fade out first.
	const ARRIVAL_TRAVEL_DELAY_MS = 150;

	const songProgress = (key) => {
		if (playingKey !== songId(key) || playTime === null) return 0;
		const { startSeconds, endSeconds } = clipFor(songId(key));
		return Math.min(1, playTime / (endSeconds - startSeconds));
	};

	// Where a clip's audio is, where it starts and stops, and when each chord
	// starts in playTime seconds (null for the evenly spaced progressions).
	const clipFor = (id) => {
		if (id.startsWith("song:")) {
			const { synced } = songFor(id.slice("song:".length));
			const { startSeconds, endSeconds } = synced.region;
			return {
				src: `${base}/${SYNCED_SONG_AUDIO_DIRECTORY}/${synced.audioFile}`,
				startSeconds,
				endSeconds,
				chordTimes: [
					...synced.chords.map(({ seconds }) => seconds - startSeconds),
					endSeconds - startSeconds
				]
			};
		}
		return {
			src: `${base}/assets/audio/progression/${id}_${progression.join("-")}.mp3`,
			startSeconds: CHORD_OFFSET,
			endSeconds: null,
			chordTimes: null
		};
	};

	// created on first play rather than in markup, so hydration/re-renders
	// never reset src mid-play
	const audioByKey = new Map();

	const audioFor = (id) => {
		const { src } = clipFor(id);
		let el = audioByKey.get(src);
		if (!el) {
			el = createAudio(src);
			el.onended = () => {
				if (playingKey === id) playingKey = null;
			};
			audioByKey.set(src, el);
		}
		return el;
	};

	const stopAll = () =>
		audioByKey.forEach((el) => {
			el.pause();
			el.currentTime = 0;
		});

	// one clip at a time; clicking the playing one stops it
	const toggle = (id) => {
		stopAll();
		if (playingKey === id) {
			playingKey = null;
			return;
		}
		playingKey = id;
		const el = audioFor(id);
		el.currentTime = id.startsWith("song:") ? clipFor(id).startSeconds : 0;
		el.play().catch(() => {
			if (playingKey === id) playingKey = null;
		});
	};

	// follow the global mute toggle, including mid-play
	$effect(() => {
		const { muted } = audio;
		audioByKey.forEach((el) => (el.muted = muted));
	});

	// track the playing audio's clock so its circle can animate in time, and
	// stop a song at the end of its clip
	$effect(() => {
		if (!playingKey) return;
		const id = playingKey;
		const el = audioFor(id);
		const { startSeconds, endSeconds } = clipFor(id);
		let frame;
		const tick = () => {
			if (endSeconds !== null && el.currentTime >= endSeconds) {
				untrack(stop);
				return;
			}
			playTime = el.currentTime - startSeconds;
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => {
			cancelAnimationFrame(frame);
			playTime = null;
		};
	});

	$effect(() => stopAll);

	const stop = () => {
		stopAll();
		playingKey = null;
	};

	onStopAll(stop);

	// this component can persist across slides; a new slide stops playback
	const appState = getContext("state");
	$effect(() => {
		appState?.slideI;
		untrack(stop);
	});
</script>

<figure
	id="roman-numerals"
	bind:clientWidth={figureWidth}
	bind:clientHeight={figureHeight}
	style:--cols={columns}
	style:--rows={Math.ceil(keys.length / columns)}
	style:--label-rows={hasSongs ? 2 : 1}
	style:--song-gap={hasSongs ? SONG_GAP : 0}
>
	<!-- keyed so a circle that stays between slides moves/scales to its new spot -->
	{#each keys as key (key)}
		{@const song = songFor(key)}
		<div
			class="circle-wrapper"
			animate:flip={{ duration: MOVE_DURATION, easing: cubicInOut }}
			in:fade={{ duration: 300, delay: MOVE_DURATION / 2 }}
			out:fade={{ duration: 200 }}
		>
			{#if song}
				<div class="song">
					<SongAnchor
						songKey={song.songKey}
						size="title"
						label="beside"
						labelPx={SONG_LABEL_PX}
						align="center"
						onclick={() => toggle(songId(key))}
						playing={playingKey === songId(key)}
						progress={songProgress(key)}
						travelDelayMs={arrivingForward ? ARRIVAL_TRAVEL_DELAY_MS : 0}
					/>
				</div>
			{:else if hasSongs}
				<!-- keeps the circles lined up with their neighbors' -->
				<span class="song-spacer" aria-hidden="true"></span>
			{/if}
			<Circle
				{key}
				{symbols}
				labelHome={showHome}
				sameRotation={rotateTogether}
				highlightShape={accentArrows}
				{progression}
				playTime={playingKey === key || playingKey === songId(key)
					? playTime
					: null}
				chordDuration={CHORD_DURATION}
				chordTimes={playingKey === songId(key)
					? clipFor(songId(key)).chordTimes
					: null}
			/>
			<button
				class="progression chords"
				aria-pressed={playingKey === key}
				onclick={() => toggle(key)}
			>
				<svg class="icon" viewBox="0 0 10 10" aria-hidden="true">
					{#if playingKey === key}
						<rect x="1.5" y="1.5" width="7" height="7" />
					{:else}
						<path d="M2 1 L9 5 L2 9 Z" />
					{/if}
				</svg>
				{chordsInKey(key)}
			</button>
		</div>
	{/each}
</figure>

<style>
	figure {
		--gap: 3rem;
		--label: 1.5rem;
		container-type: size;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-content: center;
		gap: var(--gap);
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		margin: 0;
		padding: 1.5rem 0;
	}

	.circle-wrapper {
		--size: min(
			300px,
			(100cqw - (var(--cols) - 1) * var(--gap)) / var(--cols),
			(
					(100cqh - (var(--rows) - 1) * var(--gap)) / var(--rows) -
						var(--label) * var(--label-rows)
				) /
				(1 + var(--song-gap))
		);
		width: var(--size);
		height: calc(
			var(--size) * (1 + var(--song-gap)) + var(--label) * var(--label-rows)
		);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.progression {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		font-family: var(--font-mono);
		font-size: var(--12px);
		padding: 0.375rem 0.5rem;
	}

	/* the key's song, above its circle */
	/* the gap under keeps the home chord's outline and tag clear of it */
	.song,
	.song-spacer {
		flex: none;
		height: var(--label);
		margin-bottom: calc(var(--size) * var(--song-gap));
	}

	.song {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.icon {
		width: 0.75em;
		height: 0.75em;
		fill: currentColor;
	}
</style>

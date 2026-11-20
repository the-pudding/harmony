<script>
	import { tick as nextTick, untrack } from "svelte";
	import Chord from "$components/Chord.svelte";
	import { CHORD_SIZE } from "$routes/demo/design/chord-viz/watercolor.js";
	import progressionsData from "$data/charts/top-progressions.csv";
	import {
		isDecadeByYearFile,
		keyFromByYearFile,
		slugFromByYearFile
	} from "$utils/clusterChartFile";
	import { activeChordIndex } from "$utils/activeChordIndex";
	import { attachAudio, audio, onStopAll } from "$runes/audio.svelte";
	import {
		committedSyncedSongs,
		SYNCED_SONG_AUDIO_DIRECTORY,
		syncedSongReferenceRows
	} from "$data/syncedSongs";
	import { clipOffsetSeconds } from "$data/syncedSongClips.js";
	import { signatureSongs } from "$data/signatureSongs";
	import { mapColors } from "$runes/mapColors.svelte.js";
	import { stageMap } from "$runes/stageMap.svelte";

	// The header of the map's progression-over-time chart (the
	// progressionOverTime layout): each decade's signature progression, which
	// the chart features, its decade highlighted, and its recorded songs,
	// played from their dots on the map.
	let {
		// the decade label to show ("2020s", "1950s-60s", …); defaults to the newest
		focus = null,
		// false hides the decade arrows, keeping their room
		navigable = true,
		onStage = false
	} = $props();
	// the copy's values are strings
	const canNavigate = $derived(navigable !== false && navigable !== "false");

	// Only the decade files' names are needed (which signature each decade
	// has); the chart itself is the map's (progressionOverTime).
	const files = Object.keys(import.meta.glob("$data/charts/*_by_year.csv"));

	const toSlide = (label, filePath) => {
		const slug = slugFromByYearFile(filePath);
		const progression = progressionsData.find(
			(d) => d.name.replace(/[()]/g, "").trim().replace(/\s+/g, "-") === slug
		);
		return {
			label,
			name: progression?.name ?? slug,
			chords: progression?.chordProgression.split("-") ?? [],
			scale: progression?.scale ?? "major"
		};
	};

	// each decade's signature, newest first
	const slides = files
		.filter(isDecadeByYearFile)
		.map((filePath) => toSlide(keyFromByYearFile(filePath), filePath))
		.sort((a, b) => b.label.localeCompare(a.label));

	// chords use the global `span.chords[data-chords]` spacing (as in Player),
	// which sizes them at 2.5em; this font size keeps them at their full size
	const CHORD_FONT_SIZE = CHORD_SIZE / 2.5;

	// the years a decade label covers: "1990s" → 1990–2000, "1950s-60s" → 1950–1970
	const decadeSpan = (label) => {
		const start = +label.slice(0, 4);
		const end = label.includes("-")
			? Math.floor(start / 100) * 100 + +label.match(/-(\d{2})s/)[1] + 10
			: start + 10;
		return [start, end];
	};

	const indexOf = (label) => {
		const i = slides.findIndex((s) => s.label === label);
		return i === -1 ? 0 : i;
	};

	// follows `focus` (the map animates the move); the arrows override
	// it until `focus` changes again
	let index = $derived(indexOf(focus));
	const slide = $derived(slides[index]);

	// left goes back in time (to older slides), right forward
	const canGoBack = $derived(canNavigate && index < slides.length - 1);
	const canGoForward = $derived(canNavigate && index > 0);
	// until the reader first goes back, the left arrow bounces with a hint
	let wentBack = $state(false);
	const goBack = () => {
		if (!canGoBack) return;
		wentBack = true;
		index++;
	};
	const goForward = () => {
		if (canGoForward) index--;
	};

	// The slide's recorded songs (see signatureSongs.ts), each with its
	// synced chords and clip; none when the decade has no songs, or they
	// were picked for a different signature than the charts now show.
	const clipsFor = (slide) => {
		const entry = slide && signatureSongs[slide.label];
		if (!entry || entry.progression !== slide.name) return [];
		return entry.songs.flatMap((song) => {
			const data = committedSyncedSongs[song.songKey];
			if (!data) return [];
			const row = syncedSongReferenceRows.find(
				(d) => d.songKey === song.songKey
			);
			return [
				{
					songKey: song.songKey,
					audioFile: data.audioFile,
					chords: data.chords,
					// where its audio file starts in the song (see syncedSongClips.ts)
					fileOffsetSeconds: clipOffsetSeconds(song.songKey),
					startSeconds:
						song.startSeconds ?? row?.startSeconds ?? data.region.startSeconds,
					endSeconds:
						song.endSeconds ?? row?.endSeconds ?? data.region.endSeconds
				}
			];
		});
	};

	const clips = $derived(clipsFor(slide));
	let clipIndex = $state(0);
	const clip = $derived(clips[clipIndex]);

	let audioEl = $state();
	let paused = $state(true);
	// in the song's seconds, as the clip's times are
	let currentTime = $state(0);
	const songTime = () =>
		(audioEl?.currentTime ?? 0) + (clip?.fileOffsetSeconds ?? 0);

	const playingChordIndex = $derived(
		clip && !paused
			? activeChordIndex(clip.chords, slide.chords, currentTime)
			: null
	);

	const stop = () => {
		audioEl?.pause();
		paused = true;
		clipIndex = 0;
		currentTime = 0;
	};

	const playClip = async (i) => {
		clipIndex = i;
		// lets the <audio> pick up the clip's src first
		await nextTick();
		if (!audioEl || !clip) return;
		audioEl.currentTime = clip.startSeconds - clip.fileOffsetSeconds;
		currentTime = clip.startSeconds;
		audioEl.play();
	};

	// a song's dot clicked: plays it, pauses it, or resumes it
	const togglePlay = (i) => {
		if (i === clipIndex && !paused) {
			audioEl.pause();
			return;
		}
		audio.muted = false;
		const t = songTime();
		if (i === clipIndex && clip && t > clip.startSeconds && t < clip.endSeconds)
			audioEl.play();
		else playClip(i);
	};

	const onSongKeyDown = (event, i) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		togglePlay(i);
	};

	// at a clip's end: the decade's next song, or stop after the last
	const finishClip = () => {
		if (clipIndex + 1 < clips.length) playClip(clipIndex + 1);
		else stop();
	};

	const onTimeUpdate = () => {
		if (clip && !paused && songTime() >= clip.endSeconds) finishClip();
	};

	// a new decade stops the last one's song
	$effect(() => {
		index;
		untrack(stop);
	});

	onStopAll(stop);

	// timeupdate only fires ~4x/sec, too coarse for chord changes
	$effect(() => {
		if (!audioEl || paused) return;
		let frame;
		const step = () => {
			currentTime = songTime();
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	});

	// clicked on the map: one of this decade's songs, or null to stop
	const onSongClick = (songKey) => {
		const i = clips.findIndex((c) => c.songKey === songKey);
		if (i === -1) stop();
		else togglePlay(i);
	};

	const playingSongKey = $derived(paused ? null : (clip?.songKey ?? null));
	const progressFraction = $derived.by(() => {
		if (!clip || paused) return 0;
		const span = clip.endSeconds - clip.startSeconds;
		return Math.min(1, Math.max(0, (currentTime - clip.startSeconds) / span));
	});

	// The chart features this decade's signature over its years; its songs
	// play from their dots, and the chart starts below this header.
	const owner = {};
	let figureEl = $state();
	$effect(() => {
		if (!onStage) return;
		stageMap.open(owner);
		return () => stageMap.close(owner);
	});
	$effect(() => {
		if (!onStage || !slide) return;
		const [start, end] = decadeSpan(slide.label);
		stageMap.update(owner, {
			chart: { progression: slide.name, highlight: { start, end } },
			songKeys: clips.map((c) => c.songKey),
			onSongClick
		});
	});
	$effect(() => {
		if (!onStage) return;
		stageMap.update(owner, { playingSongKey, progressFraction });
	});
	// relative to the stage, so it holds still while the text above resizes
	$effect(() => {
		if (!onStage || !figureEl) return;
		const publish = () => {
			const stageTop = figureEl.parentElement.getBoundingClientRect().top;
			stageMap.update(owner, {
				frameTop: figureEl.getBoundingClientRect().bottom - stageTop
			});
		};
		publish();
		const observer = new ResizeObserver(publish);
		observer.observe(figureEl);
		return () => observer.disconnect();
	});

	const progressionColor = $derived(
		slide ? mapColors.byProgression.get(slide.name) : undefined
	);
</script>

{#if slide}
	<figure class="signatures" bind:this={figureEl}>
		<div class="header">
			<!-- slides run newest first, so left (back in time) is the next one;
			     a hidden arrow keeps its space so the label stays centered -->
			<div class="arrow-slot">
				<button
					class:hidden={!canGoBack}
					class:beckoning={canGoBack && !wentBack}
					aria-hidden={!canGoBack}
					tabindex={canGoBack ? 0 : -1}
					aria-label="Earlier decade"
					onclick={goBack}>&larr;</button
				>
				{#if canGoBack && !wentBack}
					<span class="cta" aria-hidden="true"
						>Click to go back through time</span
					>
				{/if}
			</div>
			<div class="label" aria-live="polite">
				<div class="decade">{slide.label}</div>
				<strong class="progression" style:color={progressionColor}
					>{slide.name}</strong
				>
				<span
					class="chords"
					data-chords={slide.chords.join("-")}
					style:font-size="{CHORD_FONT_SIZE}px"
				>
					{#each slide.chords as chord, i (`${index}-${i}`)}
						<span
							class="chord"
							class:playing={i === playingChordIndex}
							class:faded={playingChordIndex !== null &&
								i !== playingChordIndex}
						>
							<Chord {chord} tonality={slide.scale} />
						</span>
					{/each}
				</span>
			</div>
			<div class="arrow-slot">
				<button
					class:hidden={!canGoForward}
					aria-hidden={!canGoForward}
					tabindex={canGoForward ? 0 : -1}
					aria-label="Later decade"
					onclick={goForward}>&rarr;</button
				>
			</div>
		</div>

		{#if clip}
			<audio
				{@attach attachAudio}
				bind:this={audioEl}
				src="{SYNCED_SONG_AUDIO_DIRECTORY}/{clip.audioFile}"
				onplay={() => (paused = false)}
				onpause={() => (paused = true)}
				ontimeupdate={onTimeUpdate}
				onended={finishClip}
			></audio>
		{/if}
	</figure>
{/if}

<style>
	figure {
		width: 100%;
		max-width: 700px;
		margin: 1rem auto 0;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.label {
		flex: 1;
		text-align: center;
	}

	.decade {
		font-family: var(--font-mono);
		font-size: var(--14px);
		letter-spacing: 0.08em;
		text-transform: lowercase;
		opacity: 0.6;
	}

	.progression {
		font-size: var(--24px);
	}

	/* lit up while its chord plays, as in SyncedChords */
	.chord {
		display: inline-block;
		transition:
			transform 150ms,
			opacity 150ms;
	}

	.chord.playing {
		opacity: 1;
		transform: scale(1.3);
	}

	.chord.faded {
		opacity: 0.4;
		transform: scale(1);
	}

	.chords {
		display: block;
		margin-top: 0.75em;
	}

	/* the default button, as beside the cluster names (ClusterTitle) */
	.arrow-slot {
		position: relative;
		flex: none;
	}

	.hidden {
		visibility: hidden;
	}

	/* a call to action until the reader first goes back */
	.beckoning {
		color: #fff;
		border-color: rgba(255, 255, 255, 0.8);
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
		animation: beckon 1.2s ease-in-out infinite;
	}

	@keyframes beckon {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(-5px);
		}
	}

	.cta {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		width: 7rem;
		font-family: var(--font-sans);
		font-size: var(--12px);
		line-height: 1.3;
		color: #fff;
		opacity: 0.8;
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.beckoning {
			animation: none;
		}
	}
</style>

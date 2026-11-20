<script>
	import PlayButton from "$components/PlayButton.svelte";
	import { getContext } from "svelte";
	import { attachAudio, onStopAll } from "$runes/audio.svelte";
	import SyncedChords from "$components/SyncedChords.svelte";
	import { committedSyncedVideos, syncedVideos } from "$data/syncedSongs";
	import { cueAt, videoCues } from "$data/videoCues";
	import { storyMedia } from "$runes/storyMedia.svelte";

	// onStage: centered under the story text, leaving a band of map below it;
	// its bottom edge is published for the map's frame.
	let { videoId, caption, onStage = false } = $props();

	const appState = getContext("state");

	let videoEl = $state();
	let paused = $state(true);
	let currentTime = $state(0);

	const cues = $derived(videoCues[videoId]);
	const cueIndex = $derived(cues ? cueAt(cues, currentTime) : -1);
	let figureEl = $state();

	const sync = $derived(committedSyncedVideos[videoId]);
	const cluster = $derived(
		syncedVideos.find((d) => d.videoId === videoId)?.cluster
	);

	// timeupdate only fires ~4x/sec, too coarse for chord changes
	$effect(() => {
		if (!(sync || cues) || !videoEl || paused) return;
		let frame;
		const tick = () => {
			currentTime = videoEl.currentTime;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	onStopAll(() => {
		if (!videoEl) return;
		videoEl.pause();
		videoEl.currentTime = 0;
		currentTime = 0;
		storyMedia.clearCue();
	});

	// Paused at the start means no cue.
	$effect(() => {
		if (!cues) return;
		if (paused && currentTime === 0) storyMedia.clearCue();
		else storyMedia.setCue(videoId, cueIndex);
	});

	// Offset is relative to the figure so it holds still while the text above
	// resizes; it changes only when the video does.
	$effect(() => {
		if (!onStage || !figureEl || !videoEl) return;
		const publish = () => {
			const video = videoEl.getBoundingClientRect();
			const offset =
				video.height > 0
					? video.bottom - figureEl.getBoundingClientRect().top
					: 0;
			storyMedia.setVideoBottomOffset(offset);
		};
		publish();
		const observer = new ResizeObserver(publish);
		observer.observe(videoEl);
		return () => {
			observer.disconnect();
			storyMedia.setVideoBottomOffset(0);
		};
	});

	$effect(() => () => storyMedia.clearCue());

	const positionCues = (track) => {
		const apply = () => {
			for (const cue of track.track.cues ?? []) {
				cue.snapToLines = false;
				cue.line = 90;
				cue.lineAlign = "end";
				cue.align = "center";
			}
		};
		if (track.readyState === 2) apply();
		track.addEventListener("load", apply);
		return () => track.removeEventListener("load", apply);
	};
</script>

<figure class:stage={onStage} bind:this={figureEl}>
	<div class="video-wrapper">
		<video
			{@attach attachAudio}
			bind:this={videoEl}
			src="assets/video/{videoId}.mp4"
			playsinline
			bind:paused
			onseeked={() => (currentTime = videoEl.currentTime)}
			onclick={() => (paused = !paused)}
		>
			<track
				default
				kind="captions"
				src="assets/video/{videoId}.vtt"
				srclang="en"
				label="English"
				{@attach positionCues}
			/>
		</video>

		<!-- hidden while playing, back (dimmed) on hover so you can pause -->
		<div class="play" class:hidden={!paused}>
			<PlayButton
				{paused}
				label="video"
				showLabel={false}
				onclick={() => (paused = !paused)}
			/>
		</div>

		{#if sync}
			<div class="shania-player" class:faded={paused}>
				<SyncedChords {cluster} chords={sync.chords} {currentTime} />
			</div>
		{/if}
	</div>
</figure>

<style>
	figure {
		height: 100%;
		max-width: var(--col-width);
		margin: 0 auto;
		padding: 0 1rem 2rem 1rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		isolation: isolate;
	}

	video {
		display: block;
		justify-self: center;
		max-width: 100%;
		max-height: 100%;
	}

	video::cue {
		font-family: var(--font-sans);
	}

	video:hover {
		cursor: pointer;
	}

	.video-wrapper {
		position: relative;
	}

	.play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		transition: opacity 0.3s ease;
	}

	.play:not(.hidden) {
		animation: pulse 1.8s ease-in-out infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.7;
			scale: 1.1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.play:not(.hidden) {
			animation: none;
		}
	}

	.play.hidden {
		opacity: 0;
		pointer-events: none;
	}

	.play.hidden:focus-within {
		opacity: 0.6;
		pointer-events: auto;
	}

	/* only on real hover, so taps on touch screens don't leave it stuck on */
	@media (hover: hover) {
		.video-wrapper:hover .play.hidden {
			opacity: 0.6;
			pointer-events: auto;
		}
	}

	/* centered under the text, leaving sky below */
	figure.stage {
		height: auto;
		padding: 0.5rem 1rem 0;
		overflow: visible;
	}

	figure.stage .video-wrapper {
		width: fit-content;
		max-width: min(480px, 90vw);
		margin: 0 auto;
	}

	figure.stage video {
		max-width: min(480px, 90vw);
		max-height: 30svh;
		margin: 0 auto;
	}

	.shania-player {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, 100%);
		pointer-events: none;
		opacity: 1;
		transition: opacity 0.3s;
	}

	.shania-player.faded {
		opacity: 0.4;
	}
</style>

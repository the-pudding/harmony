<script>
	import PlayButton from "$components/PlayButton.svelte";
	import { getContext } from "svelte";
	import { attachAudio, onStopAll } from "$runes/audio.svelte";
	import SyncedChords from "$components/SyncedChords.svelte";
	import { committedSyncedVideos, syncedVideos } from "$data/syncedSongs";
	import { cueAt, videoCues } from "$data/videoCues";
	import { storyMedia } from "$runes/storyMedia.svelte";

	// dock: "corner" pins the video to the bottom-left as a card, so the map
	// can fill the rest of the screen.
	let { videoId, caption, dock = null } = $props();

	const appState = getContext("state");

	let videoEl = $state();
	let paused = $state(true);
	let currentTime = $state(0);

	const docked = $derived(dock === "corner");
	const cues = $derived(videoCues[videoId]);
	// The cue showing at the current time (the first one while paused at 0).
	const cueIndex = $derived(cues ? cueAt(cues, currentTime) : -1);
	let cardHeight = $state(0);

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

	// Tell the map which cue is current while the clip plays or is paused
	// part-way; paused at the start means no cue.
	$effect(() => {
		if (!cues) return;
		if (paused && currentTime === 0) storyMedia.clearCue();
		else storyMedia.setCue(videoId, cueIndex);
	});

	// The docked card's height, for the map's frame.
	$effect(() => {
		storyMedia.setDockHeight(docked ? cardHeight : 0);
	});

	$effect(() => () => {
		storyMedia.clearCue();
		storyMedia.setDockHeight(0);
	});

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

<figure class:docked bind:offsetHeight={cardHeight}>
	<div class="video-wrapper">
		<video
			{@attach attachAudio}
			bind:this={videoEl}
			src="assets/video/{videoId}.mp4"
			playsinline
			bind:paused
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

	{#if cues}
		<!-- ~3 rows: the current cue centered and bold, the list sliding under it -->
		<div class="cue-list" style:--index={Math.max(cueIndex, 0)}>
			<div class="track">
				{#each cues as { artist, song }, i}
					<div class="row" class:current={i === cueIndex}>
						<strong class="song-name">{song}</strong> by {artist}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</figure>

<style>
	figure {
		--dock-inset: 16px;
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

	.cue-list {
		--row: 1.6rem;
		height: calc(var(--row) * 3);
		margin-top: 0.5rem;
		overflow: hidden;
		mask-image: linear-gradient(
			to bottom,
			transparent,
			black 30%,
			black 70%,
			transparent
		);
	}

	.track {
		/* row 0 sits in the middle slot when --index is 0 */
		transform: translateY(calc(var(--row) * (1 - var(--index))));
		transition: transform 0.4s ease;
	}

	.row {
		height: var(--row);
		line-height: var(--row);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: var(--12px);
		opacity: 0.55;
		transition: opacity 0.4s ease;
	}

	.row.current {
		opacity: 1;
	}

	.song-name {
		font-size: var(--16px);
		font-weight: 400;
	}

	.row.current .song-name {
		font-weight: 700;
	}

	/* pinned bottom-left, under the map; the map's frame leaves room for it */
	figure.docked {
		position: fixed;
		left: var(--dock-inset);
		bottom: var(--dock-inset);
		z-index: 5;
		width: min(40vw, 360px);
		height: auto;
		max-width: none;
		margin: 0;
		padding: 0.5rem 0.5rem 0.25rem;
		background: color-mix(in srgb, var(--color-bg, #0a0a0c) 92%, transparent);
		border: 1px solid var(--color-gray-700, #333);
		border-radius: 6px;
		pointer-events: auto;
	}

	figure.docked video {
		width: 100%;
	}

	@media (max-width: 600px) {
		figure.docked {
			left: 0;
			bottom: 0;
			width: 100%;
			max-height: 35svh;
			border-radius: 6px 6px 0 0;
		}

		figure.docked video {
			max-height: 20svh;
			margin: 0 auto;
		}
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

<script>
	import PlayButton from "$components/PlayButton.svelte";
	import { getContext } from "svelte";
	import { audio, onStopAll } from "$runes/audio.svelte";
	import SyncedChords from "$components/SyncedChords.svelte";
	import { committedSyncedVideos, syncedVideos } from "$data/syncedSongs";

	let { videoId, caption } = $props();

	const appState = getContext("state");

	let videoEl = $state();
	let paused = $state(true);
	let currentTime = $state(0);

	const sync = $derived(committedSyncedVideos[videoId]);
	const cluster = $derived(
		syncedVideos.find((d) => d.videoId === videoId)?.cluster
	);

	// timeupdate only fires ~4x/sec, too coarse for chord changes
	$effect(() => {
		if (!sync || !videoEl || paused) return;
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

	const songs = [
		{ artist: "Journey", song: "Don't Stop Believing" },
		{ artist: "James Blunt", song: "You're Beautiful" },
		{ artist: "Alphaville", song: "Forever Young" },
		{ artist: "Jason Mraz", song: "I'm Yours" },
		{ artist: "Mika", song: "Happy Ending" },
		{ artist: "Alex Lloyd", song: "Amazing" },
		{ artist: "The Calling", song: "Wherever You Will Go" },
		{ artist: "Elton John", song: "Can You Feel The Love Tonight" },
		{ artist: "Maroon 5", song: "She Will Be Loved" },
		{ artist: "The Last Goodnight", song: "Pictures Of You" },
		{ artist: "U2", song: "With Or Without You" },
		{ artist: "Crowded House", song: "Fall At Your Feet" },
		{ artist: "Kasey Chambers", song: "Not Pretty Enough" },
		{ artist: "The Beatles", song: "Let It Be" },
		{ artist: "Red Hot Chili Peppers", song: "Under The Bridge" },
		{ artist: "Daryl Braithwaite", song: "The Horses" },
		{ artist: "Bob Marley", song: "No Woman No Cry" },
		{ artist: "Marcy Playground", song: "Sex And Candy" },
		{ artist: "Men At Work", song: "Land Down Under" },
		{ artist: "Banjo Paterson", song: "Waltzing Matilda" },
		{ artist: "A-ha", song: "Take On Me" },
		{ artist: "Green Day", song: "When I Come Around" },
		{ artist: "Eagle Eye Cherry", song: "Save Tonight" },
		{ artist: "Toto", song: "Africa" },
		{ artist: "Beyoncé", song: "If I Were A Boy" },
		{ artist: "The Offspring", song: "Self Esteem" },
		{ artist: "The Offspring", song: "You're Gonna Go Far, Kid" },
		{ artist: "Pink", song: "You And Your Hand" },
		{ artist: "Lady Gaga", song: "Poker Face" },
		{ artist: "Aqua", song: "Barbie Girl" },
		{ artist: "The Fray", song: "You Found Me" },
		{ artist: "3OH!3", song: "Don't Trust Me" },
		{ artist: "MGMT", song: "Kids" },
		{ artist: "Tim Minchin", song: "Canvas Bags" },
		{ artist: "Natalie Imbruglia", song: "Torn" },
		{ artist: "Five For Fighting", song: "Superman" },
		{ artist: "Axis Of Awesome", song: "Birdplane" },
		{ artist: "Missy Higgins", song: "Scar" }
	];
</script>

<figure>
	<div class="video-wrapper">
		<video
			bind:this={videoEl}
			src="assets/video/{videoId}.mp4"
			playsinline
			muted={audio.muted}
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

	{#if videoId === "examples"}
		<div class="scrolling">
			<div class="track">
				{#each [0, 1] as copy}
					<div aria-hidden={copy === 1}>
						{#each songs as { artist, song }}
							<div class="row">
								<strong class="song-name">{song}</strong> by {artist}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{/if}
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

	.scrolling {
		position: relative;
		z-index: -1;
	}

	.track {
		animation: scroll-up 40s linear infinite;
	}

	.row {
		text-align: center;
		font-size: var(--12px);
	}

	.song-name {
		font-size: var(--16px);
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

	@keyframes scroll-up {
		from {
			transform: translateY(0%);
		}
		to {
			transform: translateY(-50%);
		}
	}
</style>

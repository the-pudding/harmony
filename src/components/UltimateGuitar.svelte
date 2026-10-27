<script>
	import { base } from "$app/paths";
	import playSvg from "$svg/play.svg";
	import { committedSyncedSongs } from "$data/syncedSongs";
	import { audio } from "$runes/audio.svelte";

	let { songs = 3 } = $props();

	const SONG_KEY = "journey__dont-stop-believin";
	const song = committedSyncedSongs[SONG_KEY];

	// The [Intro] chord boxes on ug-dont-stop-believin.png, in its 573×791
	// pixel space, in the order they're played. One per chord in the song's
	// synced region.
	const IMAGE_W = 573;
	const IMAGE_H = 791;
	const ROWS = [
		{ y: 295, h: 16 },
		{ y: 313, h: 17 }
	];
	const COLS = [
		{ x: 15, w: 14 },
		{ x: 45, w: 15 },
		{ x: 76, w: 30 },
		{ x: 122, w: 15 }
	];
	const chordBoxes = ROWS.flatMap((row) =>
		COLS.map((col) => ({ ...row, ...col }))
	);

	let audioEl = $state();
	let paused = $state(true);
	let currentTime = $state(0);

	// Index into song.chords of the chord sounding now, or null outside it.
	let activeChordIndex = $derived.by(() => {
		if (paused) return null;
		let index = null;
		song.chords.forEach((d, i) => {
			if (d.seconds <= currentTime) index = i;
		});
		return index;
	});

	const togglePlay = () => {
		if (!audioEl) return;
		if (!audioEl.paused) {
			audioEl.pause();
			return;
		}
		const { startSeconds, endSeconds } = song.region;
		if (audioEl.currentTime < startSeconds || audioEl.currentTime >= endSeconds)
			audioEl.currentTime = startSeconds;
		audioEl.play();
	};

	const stopAtEnd = () => {
		if (audioEl.currentTime < song.region.endSeconds) return;
		audioEl.pause();
		audioEl.currentTime = song.region.startSeconds;
	};

	$effect(() => {
		if (paused || !audioEl) return;
		let frame;
		const tick = () => {
			currentTime = audioEl.currentTime;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	// stop when we leave the single-song step
	$effect(() => {
		if (!single) audioEl?.pause();
	});

	const images = [
		{ id: "im-yours", aspect: 622 / 794, rotate: -6, yOff: 0.04, z: 1 },
		{
			id: "dont-stop-believin",
			aspect: 573 / 791,
			rotate: 0,
			yOff: -0.03,
			z: 3
		},
		{ id: "youre-beautiful", aspect: 581 / 788, rotate: 5, yOff: 0.05, z: 2 }
	];
	const FEATURED = "dont-stop-believin";
	const PAD_Y = 24;
	const PAD_X = 72; // keep clear of the 64px left/right tap arrows
	const FLY_OUT = 48; // how far past the edge the outer cards travel when hidden
	const STEP = 0.55; // horizontal offset between cards, as a fraction of card width

	let width = $state(0);
	let height = $state(0);
	let entered = $state(false);

	let single = $derived(+songs === 1);

	let layout = $derived.by(() => {
		const availW = Math.max(width - PAD_X * 2, 0);
		const availH = Math.max(height - PAD_Y * 2, 0);
		const avgAspect =
			images.reduce((sum, d) => sum + d.aspect, 0) / images.length;
		const cardH = Math.min(
			availH * 0.85,
			availW / (avgAspect * (1 + 2 * STEP)) / 1.05
		);
		const dx = cardH * avgAspect * STEP;

		return images.map((d, i) => {
			if (single) {
				if (d.id === FEATURED) {
					// no bottom padding when featured on its own
					const h = Math.min(height - PAD_Y, availW / d.aspect);
					const w = h * d.aspect;
					return {
						w,
						h,
						x: (width - w) / 2,
						y: PAD_Y + (height - PAD_Y - h) / 2,
						rotate: 0,
						opacity: 1
					};
				}
				// fly out to the side it sits on
				const h = cardH;
				const w = h * d.aspect;
				const dir = i < 1 ? -1 : 1;
				return {
					w,
					h,
					x: dir < 0 ? -w - FLY_OUT : width + FLY_OUT,
					y: (height - h) / 2 + h * d.yOff,
					rotate: d.rotate + dir * 20,
					opacity: 0
				};
			}

			const h = cardH;
			const w = h * d.aspect;
			return {
				w,
				h,
				x: width / 2 + (i - 1) * dx - w / 2,
				y: (height - h) / 2 + h * d.yOff,
				rotate: d.rotate,
				opacity: 1
			};
		});
	});

	const transformFor = (pos, i) => {
		if (entered) {
			return `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg)`;
		}
		// start below the stage, tilted, before the intro
		const tilt = (i - 1) * 18 + (i === 1 ? -8 : 0);
		return `translate(${pos.x}px, ${height + 80}px) rotate(${tilt}deg)`;
	};

	$effect(() => {
		// wait for a measured layout + painted start position before flying in
		if (!width || !height || entered) return;
		let frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(() => (entered = true));
		});
		return () => cancelAnimationFrame(frame);
	});
</script>

<div
	class="ultimate-guitar"
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{#if width && height}
		{#each images as d, i (d.id)}
			{@const pos = layout[i]}
			<div
				class="card"
				style:width="{pos.w}px"
				style:height="{pos.h}px"
				style:transform={transformFor(pos, i)}
				style:opacity={entered ? pos.opacity : 0}
				style:z-index={d.z}
				style:transition-delay="{(single ? 0 : i) * 90}ms"
			>
				<img src="{base}/assets/img/ug-{d.id}.png" alt="" />

				{#if d.id === FEATURED}
					<svg
						class="chord-boxes"
						viewBox="0 0 {IMAGE_W} {IMAGE_H}"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						{#each chordBoxes as box, j}
							<rect
								x={box.x}
								y={box.y}
								width={box.w}
								height={box.h}
								data-chord={song.chords[j]?.chord}
								class:active={j === activeChordIndex}
							/>
						{/each}
					</svg>

					<button
						class="play"
						class:enabled={single}
						class:visible={single && paused}
						aria-label="{paused ? 'Play' : 'Pause'} Don't Stop Believin'"
						tabindex={single ? 0 : -1}
						onclick={togglePlay}
					>
						{@html playSvg}
					</button>
				{/if}
			</div>
		{/each}
	{/if}

	<audio
		bind:this={audioEl}
		bind:paused
		src="{base}/assets/audio/synced-songs/{song.audioFile}"
		preload="none"
		muted={audio.muted}
		ontimeupdate={stopAtEnd}
	></audio>
</div>

<style>
	.ultimate-guitar {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100%;
	}

	.card {
		position: absolute;
		top: 0;
		left: 0;
		box-sizing: border-box;
		transform-origin: center;
		border: 3px solid var(--color-gray-200);
		will-change: transform;
		transition:
			transform 900ms cubic-bezier(0.22, 1, 0.36, 1),
			width 900ms cubic-bezier(0.22, 1, 0.36, 1),
			height 900ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 600ms ease;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.chord-boxes {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.chord-boxes rect {
		fill: transparent;
	}

	button.play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: none;
		border: none;
		padding: 0;
		height: 3rem;
		color: rgba(0, 0, 0, 0.6);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease;
	}

	/* stays clickable while playing, so tapping it again pauses */
	button.play.enabled {
		pointer-events: auto;
	}

	button.play.visible {
		opacity: 1;
	}

	button.play :global(svg) {
		height: 100%;
		width: auto;
		transition: transform 0.2s ease;
	}

	button.play:hover :global(svg) {
		transform: scale(1.1);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: opacity 300ms ease;
		}
	}
</style>

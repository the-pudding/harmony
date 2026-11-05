<script>
	import { base } from "$app/paths";
	import PlayButton from "$components/PlayButton.svelte";
	import { committedSyncedSongs } from "$data/syncedSongs";
	import { audio, onStopAll } from "$runes/audio.svelte";

	let { songs = 3 } = $props();

	const SONG_KEY = "journey__dont-stop-believin";
	const song = committedSyncedSongs[SONG_KEY];
	const IMAGE_W = 573;
	const IMAGE_H = 791;
	// the first two lines of [Verse 1], one box per chord in song.chords
	const chordBoxes = [
		{ x: 15, y: 367, w: 14, h: 16 },
		{ x: 92, y: 367, w: 14, h: 16 },
		{ x: 215, y: 367, w: 30, h: 16 },
		{ x: 338, y: 367, w: 14, h: 16 },
		{ x: 15, y: 403, w: 14, h: 16 },
		{ x: 138, y: 403, w: 14, h: 16 },
		{ x: 300, y: 403, w: 30, h: 16 },
		{ x: 338, y: 403, w: 14, h: 16 }
	];

	// each phrase fills left to right while it's sung (start/end in clip time)
	const LYRIC_Y = [384, 420];
	const LYRIC_H = 18;
	const lyrics = [
		{ line: 0, x: 39, w: 179, start: 1.2, end: 3.6 }, // Just a small town girl,
		{ line: 0, x: 247, w: 189, start: 5.0, end: 7.7 }, // livin' in a lonely world
		{ line: 1, x: 39, w: 212, start: 9.3, end: 10.8 }, // She took the midnight train
		{ line: 1, x: 255, w: 112, start: 10.8, end: 14.3 } // going anywhere
	];

	// While playing, everything outside the lines we hear is dimmed and
	// blurred. A mask cuts a soft-edged hole for both chord rows + lyrics.
	const FOCUS = { x: 6, y: 336, w: 438, h: 127 };
	const FOCUS_FEATHER = 6;
	const focusMask = `url("data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IMAGE_W} ${IMAGE_H}" preserveAspectRatio="none">` +
			`<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${FOCUS_FEATHER}"/></filter>` +
			`<mask id="m"><rect width="${IMAGE_W}" height="${IMAGE_H}" fill="white"/>` +
			`<rect x="${FOCUS.x}" y="${FOCUS.y}" width="${FOCUS.w}" height="${FOCUS.h}" rx="4" fill="black" filter="url(#f)"/></mask></defs>` +
			`<rect width="${IMAGE_W}" height="${IMAGE_H}" mask="url(#m)"/></svg>`
	)}")`;

	// the stems are a clip of the full song starting here (found by
	// cross-correlating all.mp3 against the full track)
	const CLIP_START = 17.466;
	const CLIP_END = song.region.endSeconds - CLIP_START;
	const stemSrc = (stem) =>
		`${base}/assets/audio/dont-stop-believin/${stem}.mp3`;

	let audioEl = $state();
	let paused = $state(true);
	let currentTime = $state(0);
	// which parts we hear: chords only, melody only, or both
	const MODES = [
		{ value: "chords", label: "Just chords" },
		{ value: "both", label: "Both" },
		{ value: "melody", label: "Just melody" }
	];
	let mode = $state("both");
	let chordsOn = $derived(mode !== "melody");
	let melodyOn = $derived(mode !== "chords");
	let stem = $derived(
		mode === "both" ? "all" : mode === "chords" ? "instrumental" : "vocals"
	);

	let progress = $derived(Math.min(currentTime / CLIP_END, 1));

	// the selected pill slides between options, so measure where each one sits
	let modeEls = $state([]);
	let modesWidth = $state(0);
	let pill = $derived.by(() => {
		modesWidth; // re-measure when the control resizes (e.g. fonts load)
		const el = modeEls[MODES.findIndex((m) => m.value === mode)];
		return el ? { x: el.offsetLeft, w: el.offsetWidth } : null;
	});

	// swap stems without losing our place
	$effect(() => {
		if (!audioEl) return;
		const src = stemSrc(stem);
		if (audioEl.src.endsWith(src)) return;
		const time = audioEl.currentTime;
		const wasPlaying = !audioEl.paused;
		audioEl.src = src;
		if (!time && !wasPlaying) return;
		audioEl.addEventListener(
			"loadedmetadata",
			() => {
				audioEl.currentTime = time;
				if (wasPlaying) audioEl.play();
			},
			{ once: true }
		);
		audioEl.load();
	});

	let activeChordIndex = $derived.by(() => {
		if (paused) return null;
		let index = null;
		song.chords.forEach((d, i) => {
			if (d.seconds <= currentTime + CLIP_START) index = i;
		});
		return index;
	});

	const lyricProgress = (d) =>
		Math.min(Math.max((currentTime - d.start) / (d.end - d.start), 0), 1);

	const togglePlay = () => {
		if (!audioEl) return;
		if (!audioEl.paused) {
			audioEl.pause();
			return;
		}
		if (audioEl.ended || audioEl.currentTime >= CLIP_END)
			audioEl.currentTime = 0;
		audioEl.play();
	};

	onStopAll(() => {
		if (!audioEl) return;
		audioEl.pause();
		audioEl.currentTime = 0;
	});

	const stopAtEnd = () => {
		if (audioEl.currentTime < CLIP_END) return;
		audioEl.pause();
		audioEl.currentTime = 0;
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
	// how many cards have started flying in
	let enteredCount = $state(0);

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
		if (i < enteredCount) {
			return `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg)`;
		}
		// start below the stage, tilted, before the intro
		const tilt = (i - 1) * 18 + (i === 1 ? -8 : 0);
		return `translate(${pos.x}px, ${height + 80}px) rotate(${tilt}deg)`;
	};

	// Stagger the intro with timers rather than transition-delay: the stage
	// resizes while the text box animates, and every retarget would re-apply
	// the delay, stalling the later cards until the resizing stops.
	const STAGGER = 90;
	let introStarted = false;
	let introTimers = [];

	$effect(() => {
		// wait for a measured layout + painted start position before flying in
		if (!width || !height || introStarted) return;
		introStarted = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				introTimers = images.map((_, i) =>
					setTimeout(() => (enteredCount = i + 1), i * STAGGER)
				);
			});
		});
	});

	$effect(() => () => introTimers.forEach(clearTimeout));
</script>

<div class="ultimate-guitar">
	{#if +songs === 1}
		<div class="controls">
			<PlayButton
				{paused}
				{progress}
				label="Don't Stop Believin'"
				onclick={togglePlay}
			/>

			<div
				class="modes"
				role="radiogroup"
				aria-label="Parts to hear"
				bind:clientWidth={modesWidth}
			>
				{#if pill}
					<span
						class="pill {mode}"
						style:transform="translateX({pill.x}px)"
						style:width="{pill.w}px"
						aria-hidden="true"
					>
						<span class="half left"></span>
						<span class="half right"></span>
					</span>
				{/if}
				{#each MODES as m, i}
					<button
						class="mode {m.value}"
						role="radio"
						aria-checked={mode === m.value}
						bind:this={modeEls[i]}
						onclick={() => (mode = m.value)}
					>
						{#if m.value !== "both"}
							<span class="swatch" aria-hidden="true"></span>
						{/if}
						{m.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="stage" bind:clientWidth={width} bind:clientHeight={height}>
		{#if width && height}
			{#each images as d, i (d.id)}
				{@const pos = layout[i]}
				<div
					class="card"
					style:width="{pos.w}px"
					style:height="{pos.h}px"
					style:transform={transformFor(pos, i)}
					style:opacity={i < enteredCount ? pos.opacity : 0}
					style:z-index={d.z}
				>
					<img src="{base}/assets/img/ug-{d.id}.png" alt="" />

					{#if d.id === FEATURED}
						<div
							class="focus-veil"
							class:visible={single && !paused}
							style:mask-image={focusMask}
							style:-webkit-mask-image={focusMask}
						></div>

						<svg
							class="highlights"
							viewBox="0 0 {IMAGE_W} {IMAGE_H}"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							{#each chordBoxes as box, j}
								<rect
									class="chord"
									x={box.x}
									y={box.y}
									width={box.w}
									height={box.h}
									data-chord={song.chords[j]?.chord}
									class:active={chordsOn && j === activeChordIndex}
								/>
							{/each}

							{#if melodyOn && !paused}
								{#each lyrics as d}
									<rect
										class="lyric"
										x={d.x}
										y={LYRIC_Y[d.line]}
										width={d.w * lyricProgress(d)}
										height={LYRIC_H}
									/>
								{/each}
							{/if}
						</svg>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<audio
		bind:this={audioEl}
		bind:paused
		preload="none"
		muted={audio.muted}
		ontimeupdate={stopAtEnd}
		onended={() => (audioEl.currentTime = 0)}
	></audio>
</div>

<style>
	.ultimate-guitar {
		--color-chords: #ffe0ae;
		--color-melody: #7edef6;
		display: flex;
		flex-direction: column;
		isolation: isolate;
		width: 100%;
		height: 100%;
	}

	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
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

	.focus-veil {
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		mask-size: 100% 100%;
		-webkit-mask-size: 100% 100%;
		opacity: 0;
		pointer-events: none;
		transition: opacity 500ms ease;
	}

	.focus-veil.visible {
		opacity: 1;
	}

	.highlights {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	/* multiply keeps the dark text on top readable */
	.highlights rect {
		mix-blend-mode: multiply;
	}

	.highlights .chord {
		fill: transparent;
	}

	.highlights .chord.active {
		fill: var(--color-chords);
	}

	.highlights .lyric {
		fill: var(--color-melody);
	}

	.controls {
		position: relative;
		z-index: 10;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		margin: 0 auto;
		padding: 0 1rem 0.5rem;
		font-family: var(--font-mono);
	}

	/* one segmented control for the three listening modes */
	.modes {
		position: relative;
		display: flex;
		padding: 3px;
		gap: 2px;
		border-radius: 999px;
		background: var(--color-gray-800);
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.mode {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--color-gray-300);
		font-family: inherit;
		font-size: var(--14px, 0.875rem);
		line-height: 1;
		white-space: nowrap;
		opacity: 0.45;
		cursor: pointer;
		transition:
			color 0.3s ease,
			opacity 0.3s ease;
	}

	.mode.chords {
		--part: var(--color-chords);
	}

	.mode.melody {
		--part: var(--color-melody);
	}

	.swatch {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--part);
		flex-shrink: 0;
		transition: opacity 0.3s ease;
	}

	.mode:hover {
		opacity: 0.8;
	}

	.mode[aria-checked="true"] {
		color: #09090b;
		opacity: 1;
	}

	.mode[aria-checked="true"] .swatch {
		opacity: 0;
	}

	/* slides under the selected option; each half recolors so "Both"
	   can blend from gold to blue while the pill moves */
	.pill {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 0;
		display: flex;
		border-radius: 999px;
		overflow: hidden;
		pointer-events: none;
		transition:
			transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
			width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.half {
		flex: 1;
		transition: background-color 0.35s ease;
	}

	.pill.chords .half,
	.pill.both .left {
		background-color: var(--color-chords);
	}

	.pill.melody .half,
	.pill.both .right {
		background-color: var(--color-melody);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: opacity 300ms ease;
		}

		.pill,
		.half {
			transition: none;
		}
	}
</style>

<script>
	import { area, curveMonotoneX, extent, line, max, scaleLinear } from "d3";
	import { onMount, tick as nextTick, untrack } from "svelte";
	import { Tween } from "svelte/motion";
	import { cubicInOut } from "svelte/easing";
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
	import { signatureSongs } from "$data/signatureSongs";
	import { loadHexMapSnapshot } from "$data/hexMapSnapshot.js";
	import { toCalendarYear } from "$data/songYear.js";
	import { mapColors } from "$runes/mapColors.svelte.js";
	import {
		NOT_PLAYING_ALPHA,
		OUTLINE_COLOR,
		OUTLINE_GLOW_BLUR,
		OUTLINE_WIDTH,
		OUTLINED_POINT_RADIUS,
		PLAYING_GLOW_BLUR,
		PLAYING_POINT_RADIUS,
		PLAYING_TWEEN_MS
	} from "$components/hexmap/components/scatter/constants.js";
	import { appearanceFor } from "$routes/demo/design/chord-viz/chordAppearanceLookup.js";
	import { paletteById } from "$routes/demo/design/chord-viz/chordPalettes.js";

	// focus: the decade label to show ("2020s", "1950s-60s", …); defaults to the newest
	let { focus = null } = $props();

	const files = Object.entries(
		import.meta.glob("$data/charts/*_by_year.csv", {
			eager: true,
			import: "default"
		})
	);

	const toSlide = (label, filePath, rows) => {
		const slug = slugFromByYearFile(filePath);
		const progression = progressionsData.find(
			(d) => d.name.replace(/[()]/g, "").trim().replace(/\s+/g, "-") === slug
		);
		return {
			label,
			name: progression?.name ?? slug,
			chords: progression?.chordProgression.split("-") ?? [],
			scale: progression?.scale ?? "major",
			rows: rows.map((d) => ({ year: +d.year, percent: +d.percent }))
		};
	};

	// each decade's signature, newest first
	const slides = files
		.filter(([filePath]) => isDecadeByYearFile(filePath))
		.map(([filePath, rows]) =>
			toSlide(keyFromByYearFile(filePath), filePath, rows)
		)
		.sort((a, b) => b.label.localeCompare(a.label));

	// every file covers the same years, so slides can tween point by point
	const years = slides[0]?.rows.map((d) => d.year) ?? [];

	// one y axis for every slide
	const yMax = max(slides.flatMap((s) => s.rows.map((d) => d.percent))) ?? 0;

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

	// follows `focus` (the tweens below animate the move); the arrows override
	// it until `focus` changes again
	let index = $derived(indexOf(focus));
	const slide = $derived(slides[index]);

	// left goes back in time (to older slides), right forward
	const canGoBack = $derived(index < slides.length - 1);
	const canGoForward = $derived(index > 0);
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
	let currentTime = $state(0);

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
		audioEl.currentTime = clip.startSeconds;
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
		const t = audioEl?.currentTime ?? 0;
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
		if (clip && !paused && audioEl.currentTime >= clip.endSeconds) finishClip();
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
			currentTime = audioEl.currentTime;
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	});

	const highlight = Tween.of(() => (slide ? decadeSpan(slide.label) : [0, 0]), {
		duration: 700,
		easing: cubicInOut
	});

	const percents = Tween.of(() => slide?.rows.map((d) => d.percent) ?? [], {
		duration: 700,
		easing: cubicInOut
	});

	// same size as the full ClusterPercentOverTime chart on the previous slide
	const margin = { top: 16, right: 16, bottom: 32, left: 40 };
	const height = 240;
	let width = $state(0);

	const x = $derived(
		scaleLinear()
			.domain(extent(years))
			.range([margin.left, width - margin.right])
	);
	const y = scaleLinear()
		.domain([0, yMax])
		.nice()
		.range([height - margin.bottom, margin.top]);

	// clamped to the data's years, since the corpus starts partway through 1958
	const highlightX = $derived.by(() => {
		const [first, last] = extent(years);
		const [start, end] = highlight.current;
		const x1 = x(Math.max(first, start));
		const x2 = x(Math.min(last, end));
		return { x: x1, width: Math.max(0, x2 - x1) };
	});

	const points = $derived(
		years.map((year, i) => ({ year, percent: percents.current[i] ?? 0 }))
	);
	const linePath = $derived(
		line()
			.curve(curveMonotoneX)
			.x((d) => x(d.year))
			.y((d) => y(d.percent))(points)
	);
	const areaPath = $derived(
		area()
			.curve(curveMonotoneX)
			.x((d) => x(d.year))
			.y0(y(0))
			.y1((d) => y(d.percent))(points)
	);

	// song titles and years, for the dots
	let snapshot = $state.raw(null);
	onMount(() => {
		let active = true;
		void loadHexMapSnapshot().then((loaded) => {
			if (active) snapshot = loaded;
		});
		return () => {
			active = false;
		};
	});

	// Each song's marker, drawn as the map's playable dots (markedSongs.ts):
	// the song's map color inside a glowing white ring, a play icon on
	// hover, and while playing a bigger marker with a progress ring colored
	// by chord and a pause icon. Labels as in the explore beeswarm
	// (ClusterYearBeeswarm).
	const DOT_RADIUS = OUTLINED_POINT_RADIUS;
	const LABEL_FONT_SIZE = 10;
	const LABEL_HEIGHT = 12;
	const LABEL_MAX_CHARS = 28;
	// between a label and its dot (at its playing size), the line, or
	// another label
	const LABEL_GAP = 4;
	// a label lifted further than this from its dot gets a leader line
	const LEADER_MIN = 6;

	const truncate = (text) =>
		text.length > LABEL_MAX_CHARS
			? `${text.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…`
			: text;

	let figureEl = $state();
	const measureContext =
		typeof document === "undefined"
			? null
			: document.createElement("canvas").getContext("2d");
	// the bold title, then a space and the regular-weight artist
	const labelWidth = (title, artist) => {
		if (!measureContext || !figureEl)
			return (title.length + 1 + artist.length) * 6;
		const font =
			getComputedStyle(figureEl).getPropertyValue("--font-sans") ||
			"sans-serif";
		measureContext.font = `700 ${LABEL_FONT_SIZE}px ${font}`;
		const titleWidth = measureContext.measureText(title).width;
		measureContext.font = `400 ${LABEL_FONT_SIZE}px ${font}`;
		return titleWidth + measureContext.measureText(` ${artist}`).width;
	};

	// The highest the line gets between x0 and x1 (as a y), counting the
	// points just outside so the curve between them is covered.
	const lineTopBetween = (x0, x1) => {
		let top = Infinity;
		points.forEach((d, i) => {
			const prev = points[i - 1];
			const next = points[i + 1];
			const inSpan =
				(next ? x(next.year) >= x0 : true) &&
				(prev ? x(prev.year) <= x1 : true);
			if (inSpan) top = Math.min(top, y(d.percent));
		});
		return top;
	};

	// each song's dot, on the line at its release year, with its label just
	// above: lifted clear of the line and of the labels placed before it
	const songDots = $derived.by(() => {
		if (!snapshot || !width) return [];
		const placed = [];
		return clips.flatMap((c, i) => {
			const s = snapshot.songKeys.indexOf(c.songKey);
			const year = s === -1 ? undefined : snapshot.years?.[s];
			if (!year) return [];
			const yearIndex = years.indexOf(toCalendarYear(year));
			if (yearIndex === -1) return [];
			const dotX = x(years[yearIndex]);
			const dotY = y(points[yearIndex]?.percent ?? 0);
			const text = truncate(snapshot.titles[s]);
			const artist = truncate(snapshot.artists[s]?.join(", ") ?? "");

			const textWidth = labelWidth(text, artist);
			const labelX = Math.min(
				Math.max(dotX, textWidth / 2),
				width - textWidth / 2
			);
			const left = labelX - textWidth / 2;
			const right = labelX + textWidth / 2;
			const restingBottom = dotY - PLAYING_POINT_RADIUS - LABEL_GAP;
			let bottom = Math.min(
				restingBottom,
				lineTopBetween(left, right) - LABEL_GAP
			);
			for (let moved = true; moved; ) {
				moved = false;
				for (const box of placed) {
					const overlapsX =
						left < box.right + LABEL_GAP && right > box.left - LABEL_GAP;
					const overlapsY =
						bottom > box.top - LABEL_GAP &&
						bottom - LABEL_HEIGHT < box.bottom + LABEL_GAP;
					if (overlapsX && overlapsY) {
						bottom = box.top - LABEL_GAP;
						moved = true;
					}
				}
			}
			placed.push({ left, right, top: bottom - LABEL_HEIGHT, bottom });

			return [
				{
					i,
					songKey: c.songKey,
					text,
					artist,
					year: toCalendarYear(year),
					x: dotX,
					y: dotY,
					fill: mapColors.bySong?.(c.songKey) ?? OUTLINE_COLOR,
					labelX,
					// text baseline, leaving room for descenders
					labelY: bottom - 2,
					leader: restingBottom - bottom > LEADER_MIN ? bottom : null
				}
			];
		});
	});

	const playingIndex = $derived(paused ? null : clipIndex);

	// the playing clip's progress ring, split by chord and colored as in
	// Chord.svelte (as in Player.svelte)
	const RING_RADIUS = PLAYING_POINT_RADIUS - 2;
	const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
	const progressSegments = $derived.by(() => {
		if (!clip || paused) return [];
		const span = clip.endSeconds - clip.startSeconds;
		const fraction = (seconds) =>
			Math.min(1, Math.max(0, (seconds - clip.startSeconds) / span));
		const progress = fraction(currentTime);
		const tonality = slide.scale === "minor" ? "minor" : "major";
		const palette = paletteById("journey-from-home");
		return clip.chords.flatMap(({ seconds, roman }, i) => {
			const from = fraction(seconds);
			const to = Math.min(
				progress,
				fraction(clip.chords[i + 1]?.seconds ?? clip.endSeconds)
			);
			if (to <= from) return [];
			return [
				{
					from,
					to,
					color: appearanceFor(tonality, roman, palette).colors.fill
				}
			];
		});
	});

	// the play icon (a triangle) and pause icon (two bars), as on the map
	const playIconPoints = (cx, cy) => {
		const size = DOT_RADIUS * 0.6;
		return [
			[cx - size * 0.35, cy - size * 0.55],
			[cx - size * 0.35, cy + size * 0.55],
			[cx + size * 0.7, cy]
		]
			.map((p) => p.join(","))
			.join(" ");
	};
	const PAUSE_BAR_WIDTH = PLAYING_POINT_RADIUS * 0.2;
	const PAUSE_BAR_HEIGHT = PLAYING_POINT_RADIUS * 0.7;
</script>

{#if slide}
	<figure class="signatures" bind:clientWidth={width} bind:this={figureEl}>
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
				<strong class="progression">{slide.name}</strong>
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

		{#if width}
			<svg {width} {height}>
				<rect
					class="highlight"
					x={highlightX.x}
					width={highlightX.width}
					y={margin.top}
					height={height - margin.top - margin.bottom}
				/>
				{#each y.ticks(4) as tick (tick)}
					<g class="tick" transform="translate(0, {y(tick)})">
						<line x1={margin.left} x2={width - margin.right} />
						<text x={margin.left - 6} dy="0.32em" text-anchor="end"
							>{tick}%</text
						>
					</g>
				{/each}
				{#each x.ticks(6) as tick (tick)}
					<text
						class="tick"
						x={x(tick)}
						y={height - margin.bottom + 20}
						text-anchor="middle">{tick}</text
					>
				{/each}
				<path class="area" d={areaPath} />
				<path class="line" d={linePath} />
				<g
					class="songs"
					class:emphasizing={playingIndex !== null}
					style:--outline-glow="{OUTLINE_GLOW_BLUR}px"
					style:--playing-glow="{PLAYING_GLOW_BLUR}px"
					style:--not-playing-alpha={NOT_PLAYING_ALPHA}
					style:--tween="{PLAYING_TWEEN_MS}ms"
				>
					{#each songDots as dot (dot.songKey)}
						{@const playing = dot.i === playingIndex}
						{@const radius = playing ? PLAYING_POINT_RADIUS : DOT_RADIUS}
						<g
							class="song"
							class:playing
							role="button"
							tabindex="0"
							aria-label="{playing
								? 'Pause'
								: 'Play'} {dot.text} by {dot.artist} ({dot.year})"
							onclick={() => togglePlay(dot.i)}
							onkeydown={(event) => onSongKeyDown(event, dot.i)}
						>
							{#if dot.leader !== null}
								<line
									class="leader"
									x1={dot.x}
									x2={dot.x}
									y1={dot.leader}
									y2={dot.y - radius - 2}
								/>
							{/if}
							<text
								class="song-label"
								x={dot.labelX}
								y={dot.labelY}
								text-anchor="middle"
								style:font-size="{LABEL_FONT_SIZE}px"
								><tspan class="song-title">{dot.text}</tspan
								>{#if dot.artist}{" "}<tspan class="song-artist"
										>{dot.artist}</tspan
									>{/if}</text
							>
							<circle
								class="outline"
								cx={dot.x}
								cy={dot.y}
								r={radius}
								style:r="{radius}px"
							/>
							<circle
								class="fill"
								cx={dot.x}
								cy={dot.y}
								r={radius - OUTLINE_WIDTH}
								style:r="{radius - OUTLINE_WIDTH}px"
								fill={dot.fill}
							/>
							{#if playing}
								<g class="progress" transform="rotate(-90 {dot.x} {dot.y})">
									<circle class="track" cx={dot.x} cy={dot.y} r={RING_RADIUS} />
									{#each progressSegments as segment, s (s)}
										<circle
											cx={dot.x}
											cy={dot.y}
											r={RING_RADIUS}
											stroke={segment.color}
											stroke-dasharray="{(segment.to - segment.from) *
												RING_LENGTH} {RING_LENGTH}"
											stroke-dashoffset={-segment.from * RING_LENGTH}
										/>
									{/each}
								</g>
								{#each [-1, 1] as side (side)}
									<rect
										class="icon"
										x={dot.x +
											side * PAUSE_BAR_WIDTH * 1.1 -
											PAUSE_BAR_WIDTH / 2}
										y={dot.y - PAUSE_BAR_HEIGHT / 2}
										width={PAUSE_BAR_WIDTH}
										height={PAUSE_BAR_HEIGHT}
									/>
								{/each}
							{:else}
								<polygon
									class="icon play-icon"
									points={playIconPoints(dot.x, dot.y)}
								/>
							{/if}
						</g>
					{/each}
				</g>
			</svg>
		{/if}

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
		margin: 2rem auto;
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

	/* the featured songs' dots, drawn as the map's playable dots
	   (markedSongs.ts), labeled as in ClusterYearBeeswarm */
	.song {
		cursor: pointer;
		outline: none;
		transition: opacity 200ms ease;
	}

	.outline,
	.fill {
		transition: r var(--tween) ease;
	}

	.outline {
		fill: #fff;
		filter: drop-shadow(0 0 calc(var(--outline-glow) / 2) #fff);
		transition:
			r var(--tween) ease,
			filter var(--tween) ease;
	}

	.song.playing .outline {
		filter: drop-shadow(0 0 calc(var(--playing-glow) / 2) #fff);
	}

	.song:focus-visible .outline {
		stroke: #fff;
		stroke-width: 1;
		stroke-dasharray: 2 2;
	}

	.progress circle {
		fill: none;
		stroke-width: 4;
	}

	.progress .track {
		stroke: rgba(0, 0, 0, 0.35);
	}

	.icon {
		fill: #fff;
		pointer-events: none;
	}

	/* on hover, as on the map */
	.play-icon {
		opacity: 0;
	}

	.song:hover .play-icon,
	.song:focus-visible .play-icon {
		opacity: 1;
	}

	.leader {
		stroke: rgba(255, 255, 255, 0.35);
		stroke-width: 1;
	}

	/* Atlas Typewriter only comes in medium; Atlas Grotesk has a regular. */
	.song-label {
		font-family: var(--font-sans);
		font-weight: 400;
		fill: rgba(244, 244, 245, 0.75);
	}

	.song:hover .song-label,
	.song:focus-visible .song-label,
	.song.playing .song-label {
		fill: #fff;
	}

	.song-title {
		font-weight: 700;
	}

	.song.playing .leader {
		stroke: rgba(255, 255, 255, 0.8);
	}

	/* While a song plays, the others fade back, as on the map. */
	.emphasizing .song:not(.playing) {
		opacity: var(--not-playing-alpha);
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

	.highlight {
		fill: var(--color-fg);
		opacity: 0.06;
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

	svg {
		display: block;
		overflow: visible;
	}

	.tick line {
		stroke: var(--color-fg);
		opacity: 0.15;
	}

	.tick text,
	text.tick {
		fill: var(--color-fg);
		opacity: 0.6;
		font-size: var(--12px);
		font-variant-numeric: tabular-nums;
	}

	.area {
		fill: var(--color-fg);
		opacity: 0.4;
	}

	.line {
		fill: none;
		stroke: var(--color-fg);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
</style>

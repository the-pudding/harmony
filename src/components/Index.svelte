<script>
	import Chapters from "$components/Chapters.svelte";
	import Landing from "$components/Landing.svelte";
	import HexMap from "$components/HexMap.svelte";
	import Tap from "$components/helpers/Tap.svelte";
	import Slider from "$components/helpers/Slider.svelte";
	import Slide from "$components/helpers/Slider.Slide.svelte";
	import Video from "$components/Video.svelte";
	import Player from "$components/Player.svelte";
	import ClusterBeeswarm from "$components/ClusterBeeswarm.svelte";
	import SongChordsDrawer from "$components/song-chords-drawer/SongChordsDrawer.svelte";
	import UltimateGuitar from "$components/UltimateGuitar.svelte";
	import RomanNumerals from "$components/RomanNumerals.svelte";
	import EffectiveBar from "$components/EffectiveBar.svelte";
	import ChordShares from "$components/ChordShares.svelte";
	import EffectiveDecades from "$components/EffectiveDecades.svelte";
	import ClusterPercentOverTime from "$components/ClusterPercentOverTime.svelte";
	import EffectiveProgressions from "$components/EffectiveProgressions.svelte";
	import Signatures from "$components/Signatures.svelte";
	import ExploreControls from "$components/ExploreControls.svelte";
	import AudioGate from "$components/AudioGate.svelte";
	import List from "$components/List.svelte";
	import Footer from "$components/Footer.svelte";
	import Methods from "$components/Methods.svelte";
	import CMS from "$components/helpers/CMS.svelte";
	import { fade } from "svelte/transition";
	import copy from "$data/copy.json";
	import {
		DEFAULT_MAP_SCENE,
		parseMapScene
	} from "$components/storymap/mapScene";
	import { chordify } from "$utils/chordify";
	import { setContext } from "svelte";
	import { storyMedia } from "$runes/storyMedia.svelte";
	import { createExplore } from "$runes/explore.svelte";
	import { sameClusterName } from "$data/clusterName";
	import { spanStyle } from "$routes/demo/record/timelineStyles";
	import { audio, stopAllAudio } from "$runes/audio.svelte";
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (1/3): ?slide=N URL persistence. See
	// src/utils/slideParam.js for full removal instructions. Delete this import.
	import { readSlideParam, writeSlideParam } from "$utils/slideParam";
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (muted 1/3): ?muted=true|false URL
	// persistence. See src/utils/mutedParam.js for removal instructions. Delete
	// this import.
	import { readMutedParam, writeMutedParam } from "$utils/mutedParam";
	import mutedSvg from "$svg/muted.svg";
	import unmutedSvg from "$svg/unmuted.svg";

	const components = {
		Landing,
		Video,
		List,
		EffectiveBar,
		ChordShares,
		EffectiveDecades,
		ClusterPercentOverTime,
		Signatures,
		UltimateGuitar,
		RomanNumerals,
		EffectiveProgressions,
		ExploreControls,
		AudioGate,
		Methods,
		Footer
	};

	let slideCount = 0;
	const sections = copy.sections.map((section) => ({
		...section,
		slides: section.slides.map((s) => ({ ...s, i: slideCount++ }))
	}));
	const allSlides = sections
		.map((d, i) => d.slides.map((s) => ({ ...s, section: i })))
		.flat();

	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (2/3): when removing, change the next line
	// to `$state(0)`.
	let slideI = $state(readSlideParam(allSlides.length));
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (3/3): delete the next line entirely.
	$effect(() => writeSlideParam(slideI));
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (muted 2/3): delete these two lines.
	const initialMuted = readMutedParam();
	if (initialMuted !== undefined) audio.muted = initialMuted;
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (muted 3/3): delete the next line entirely.
	$effect(() => writeMutedParam(audio.muted));
	let { text, stage, overlay, map } = $derived(allSlides[slideI]);
	let { component: stageComponentName, ...stageProps } = $derived(stage ?? {});
	let { component: overlayComponentName, ...overlayProps } = $derived(
		overlay ?? {}
	);
	let onExploreSlide = $derived(
		text?.some((block) => block.type === "ExploreControls") ?? false
	);
	let StageComponent = $derived(
		stageComponentName ? (components[stageComponentName] ?? null) : null
	);
	let OverlayComponent = $derived(
		overlayComponentName ? (components[overlayComponentName] ?? null) : null
	);

	setContext("state", {
		get slideI() {
			return slideI;
		},
		set slideI(value) {
			goToSlide(value);
		}
	});

	// a <button><strong class=progression> in the text refocuses the map on
	// that cluster; the slide's own focusCluster comes back on the next visit
	let textFocusCluster = $state();
	let mapScene = $derived.by(() => {
		const scene = parseMapScene(map);
		return scene === null || textFocusCluster === undefined
			? scene
			: { ...scene, camera: { kind: "cluster", name: textFocusCluster } };
	});
	// The cluster the map is focused on, if any.
	let focusedCluster = $derived(
		mapScene?.camera.kind === "cluster" ? mapScene.camera.name : undefined
	);

	// The text's cluster buttons (from the copy's HTML) show which one the
	// map is on, in the selected style.
	let textInnerEl = $state();
	$effect(() => {
		const focused = focusedCluster;
		void text;
		if (!textInnerEl) return;
		for (const button of textInnerEl.querySelectorAll("button")) {
			const strong = button.querySelector(
				"strong.progression, strong.progressions"
			);
			if (!strong) continue;
			const selected =
				focused !== undefined &&
				sameClusterName(strong.textContent.trim(), focused);
			button.classList.toggle("selected", selected);
			button.setAttribute("aria-pressed", String(selected));
		}
	});

	const onTextClick = (event) => {
		const strong = event.target
			.closest("button")
			?.querySelector("strong.progression, strong.progressions");
		const cluster = strong?.textContent.trim();
		if (!cluster) return;
		enteredWithoutMap = false;
		textFocusCluster = cluster;
	};

	let textHeight = $state();
	// The text box as drawn, which lags textHeight while its height animates.
	let textBoxHeight = $state(0);
	let clusterFrameEl = $state();
	let clusterFrameHeight = $state(0);
	// Where the cluster frame ends up once the text box finishes resizing, so
	// the map frames the cluster once instead of chasing the animation.
	// Consecutive slides showing the same stage component: the text box keeps
	// the height of the longest of their texts, so the stage (the room left
	// under the text) stays the same size while it steps through them.
	let stageRun = $derived.by(() => {
		const name = allSlides[slideI].stage?.component;
		if (!name) return [];
		let first = slideI;
		let last = slideI;
		while (first > 0 && allSlides[first - 1].stage?.component === name) first--;
		while (
			last < allSlides.length - 1 &&
			allSlides[last + 1].stage?.component === name
		)
			last++;
		return last > first ? allSlides.slice(first, last + 1) : [];
	});
	// Measured off screen; only plain text and lists, so components in the
	// text aren't mounted twice.
	const MEASURED_BLOCK_TYPES = ["text", "ol"];
	let runTextHeights = $state([]);
	let reservedTextHeight = $derived(
		stageRun.length
			? Math.max(0, ...runTextHeights.slice(0, stageRun.length).map(Number))
			: 0
	);
	// The height the text box is heading to (it animates there).
	let textBoxTarget = $derived(
		Math.max(textHeight ?? 0, reservedTextHeight) || null
	);

	let textBoxGrowth = $derived(
		text.length && textBoxTarget && textBoxHeight
			? textBoxTarget - textBoxHeight
			: 0
	);
	let focusFrame = $derived(
		clusterFrameEl && clusterFrameHeight - textBoxGrowth > 0
			? {
					top: clusterFrameEl.offsetTop + textBoxGrowth,
					height: clusterFrameHeight - textBoxGrowth
				}
			: null
	);
	// The rect framed map layouts (e.g. the timeline) fill, as insets from
	// the map's edges: a gap below the text box, and room at the bottom
	// for an axis label. (The map never puts songs closer than its own
	// margin to an edge either.)
	const MAP_FRAME_GAP = 16;
	const MAP_FRAME_BOTTOM = 48;
	// A docked video card (bottom-left, 16px from the edges) pushes the
	// bottom up above it.
	const DOCK_INSET = 16;
	let mapFrame = $derived({
		top: focusFrame ? focusFrame.top + MAP_FRAME_GAP : 0,
		right: 0,
		bottom:
			storyMedia.dockHeight > 0
				? Math.max(
						MAP_FRAME_BOTTOM,
						storyMedia.dockHeight + DOCK_INSET + MAP_FRAME_GAP
					)
				: MAP_FRAME_BOTTOM,
		left: 0
	});
	// What's explored, playing and open (see explore.svelte.ts). On the
	// explore slide any clicked cluster opens the panel and only panning or
	// zooming closes it; elsewhere only clusters with samples open it.
	const explore = createExplore({
		get exploreSlide() {
			return onExploreSlide;
		}
	});
	let activeCluster = $derived(focusedCluster ?? explore.clusterName);
	let showClusterPanel = $derived(activeCluster !== undefined);
	// hidePlayer drops the focused cluster's player (its name, arrows and
	// chords) along with its featured songs on the map. The panel stays, empty,
	// so the map frames the cluster the same as when the player shows, and
	// the next slide's player doesn't shift everything.
	let playerHidden = $derived(
		mapScene?.player.hidden === true && focusedCluster !== undefined
	);

	// Hover links the explore panel's beeswarm and the map, both ways.
	let hoveredInBeeswarm = $state(null);
	let hoveredOnMap = $state(null);

	// Where the explored cluster's title sits under it on the map at dot
	// zoom: the player draws its header there instead of in the panel, and
	// its slot in the panel keeps the room.
	let titleAnchor = $state(null);
	let playerHeight = $state(0);
	let playerAnchor = $derived(
		explore.clusterName !== undefined ? titleAnchor : null
	);

	setContext("explore", {
		pickSong: (songKey, clusterName) =>
			explore.searchSong(songKey, clusterName),
		pickCluster: (clusterName) => explore.pickCluster(clusterName),
		playSong: explore.playSong,
		// The song the slide's map plays when asked to (AudioGate's button).
		get firstPlayableSongKey() {
			return mapScene?.songs.playable[0] ?? null;
		},
		get searchedSongKey() {
			return explore.searchedSongKey;
		}
	});

	// A new slide starts with nothing explored, playing or open, on its own
	// focusCluster.
	// Coming from a slide with no map, the map appears already on its
	// focusCluster instead of zooming there; every other move animates.
	let enteredWithoutMap = $state(false);
	const goToSlide = (i) => {
		if (i === slideI) return;
		enteredWithoutMap = mapScene === null;
		slideI = i;
		textFocusCluster = undefined;
		explore.reset();
	};

	// The map zooms on wheels and pinches over its canvas. Anything drawn
	// over it (cluster titles, labels, the panel and its player) would catch
	// them instead, and a pinch (a ctrl-wheel) would zoom the whole page.
	// So: a pinch never zooms the page, and goes to the map; a plain wheel
	// over the map's overlays or the panel does too.
	let mapLayerEl = $state();
	const onWindowWheel = (event) => {
		const canvas = mapLayerEl?.querySelector("canvas");
		const pinch = event.ctrlKey;
		if (pinch) event.preventDefault();
		if (!canvas || event.target === canvas || mapScene === null) return;
		const overMap =
			mapLayerEl.contains(event.target) ||
			event.target.closest?.("[data-wheel-to-map]");
		if (!pinch && !overMap) return;
		event.preventDefault();
		canvas.dispatchEvent(new WheelEvent("wheel", event));
	};
	// Safari's trackpad pinch also sends its own gesture events, which zoom
	// the page unless cancelled.
	const preventPageZoom = (event) => event.preventDefault();
	$effect(() => {
		// not passive, or preventDefault can't stop the page zooming
		window.addEventListener("wheel", onWindowWheel, { passive: false });
		window.addEventListener("gesturestart", preventPageZoom);
		window.addEventListener("gesturechange", preventPageZoom);
		return () => {
			window.removeEventListener("wheel", onWindowWheel);
			window.removeEventListener("gesturestart", preventPageZoom);
			window.removeEventListener("gesturechange", preventPageZoom);
		};
	});

	const INTERACTIVE =
		'a, button, input, label, select, textarea, audio, video, [tabindex]:not([tabindex="-1"]), [data-chords-drawer]';
	let articleEl = $state();

	// article is pointer-events: none, so most "blank space" clicks land on
	// the body or the map beneath it; listen on the window to catch them all
	const onWindowClick = (event) => {
		// use the dispatch-time path: handlers like the mute toggle can swap
		// out event.target before the click bubbles here
		if (event.composedPath().some((el) => el.matches?.(INTERACTIVE))) return;
		stopAllAudio();
		// the map clears its own song on background clicks
		if (articleEl?.contains(event.target)) explore.stopPlaying();
	};

	const onTap = (dir) => {
		if (dir === "right" && slideI < allSlides.length - 1) {
			goToSlide(slideI + 1);
		} else if (dir === "left" && slideI > 0) {
			goToSlide(slideI - 1);
		}
	};
</script>

<Tap
	ontap={onTap}
	size="64px"
	showArrows
	disable={explore.chordsSongKey
		? ["left", "right"]
		: [
				...(slideI === 0 ? ["left"] : []),
				...(slideI === allSlides.length - 1 ? ["right"] : [])
			]}
	arrowStroke="#fff"
	enableKeyboard={true}
/>

<div
	class="map-layer"
	bind:this={mapLayerEl}
	class:visible={mapScene !== null}
	class:faded={overlay}
	aria-hidden={mapScene === null}
>
	<HexMap
		scene={mapScene ?? DEFAULT_MAP_SCENE}
		{focusFrame}
		{mapFrame}
		instantFocus={enteredWithoutMap}
		theme="dark"
		playingSongKey={explore.playingSongKey ?? null}
		playingClipProgressFraction={audio.clipProgressFraction}
		playingChordColorSegments={audio.chordColorSegments}
		onSampleClick={explore.playSong}
		exploredClusterName={explore.clusterName ?? null}
		searchedSongKey={explore.searchedSongKey ?? null}
		onClusterPick={explore.pickCluster}
		onUserMove={explore.userMoved}
		chordsSongKey={explore.chordsSongKey ?? null}
		onSongChordsToggle={onExploreSlide ? explore.toggleChords : undefined}
		linkedSongKey={hoveredInBeeswarm}
		onSongHover={(songKey) => (hoveredOnMap = songKey)}
		onExploredTitleAnchor={(anchor) => (titleAnchor = anchor)}
	/>
</div>

<svelte:window onclick={onWindowClick} />

<!-- the slide's own playable songs (no cluster open), played by clicking
     their dots; the dot's progress ring is the only UI -->
{#if mapScene && mapScene.songs.playable.length > 0 && !showClusterPanel}
	<Player
		songKeys={mapScene.songs.playable}
		headless
		bind:playingSongKey={explore.playingSongKey}
	/>
{/if}

<article bind:this={articleEl}>
	<Chapters activeSlide={slideI} {sections} onselect={goToSlide} />

	<div
		class="overlay"
		class:visible={OverlayComponent}
		class:list={overlayComponentName === "List"}
	>
		{#if OverlayComponent}
			<OverlayComponent {...overlayProps} />
		{/if}
	</div>

	{#if text.length}
		<!-- clicks are delegated from the <button>s inside, which handle keys -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="text frosted"
			onclick={onTextClick}
			style:height={textBoxTarget ? `${textBoxTarget}px` : null}
			bind:clientHeight={textBoxHeight}
			in:fade={{ duration: 250 }}
		>
			<div
				class="text-inner"
				bind:this={textInnerEl}
				bind:clientHeight={textHeight}
			>
				{#key text}
					<div
						in:fade={{ delay: 200, duration: 250 }}
						out:fade={{ duration: 150 }}
						{@attach chordify}
					>
						<CMS content={text} {components} />
					</div>
				{/key}
			</div>
		</div>
	{/if}

	{#if stageRun.length}
		<!-- every text in the stage run, laid out like the real one but hidden,
		     to find the tallest -->
		<div class="text text-measure" aria-hidden="true">
			{#each stageRun as slide, i (i)}
				<div class="text-inner" bind:clientHeight={runTextHeights[i]}>
					<div {@attach chordify}>
						<CMS
							content={(slide.text ?? []).filter((block) =>
								MEASURED_BLOCK_TYPES.includes(block.type)
							)}
							{components}
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="stage">
		<div
			class="main"
			bind:this={clusterFrameEl}
			bind:clientHeight={clusterFrameHeight}
		>
			{#if StageComponent}
				<!-- a fresh <video>/<track> per video, or the old track's cues linger -->
				{#key stageProps.videoId}
					<StageComponent {...stageProps} />
				{/key}
			{/if}
		</div>

		{#if showClusterPanel}
			<div
				class="panel"
				class:explore={onExploreSlide}
				class:empty={playerHidden && !onExploreSlide}
				data-wheel-to-map
				in:fade={{ duration: 300, delay: 800 }}
			>
				<!-- keeps the player's room while it's drawn under its cluster -->
				{#if !playerHidden}
					<div
						class="player-slot"
						style:min-height={playerAnchor ? `${playerHeight}px` : null}
						in:fade={{ duration: 300 }}
					>
						<Player
							cluster={activeCluster}
							bind:playingSongKey={explore.playingSongKey}
							bind:height={playerHeight}
							anchor={playerAnchor}
							chordsOpen={explore.chordsSongKey !== undefined &&
								explore.chordsSongKey === explore.playingSongKey}
							onToggleChords={onExploreSlide ? explore.toggleChords : null}
						/>
					</div>
				{/if}
				{#if onExploreSlide}
					<ClusterBeeswarm
						cluster={activeCluster}
						playingSongKey={explore.playingSongKey ?? null}
						mapHoveredSongKey={hoveredOnMap}
						selectedSongKey={explore.chordsSongKey ?? null}
						onHoverSong={(songKey) => (hoveredInBeeswarm = songKey)}
						onPlaySong={(songKey) =>
							explore.playSong(
								songKey === explore.playingSongKey ? null : songKey
							)}
						onOpenChords={(songKey) => {
							explore.stopPlaying();
							explore.toggleChords(songKey);
						}}
					/>
				{/if}
			</div>
		{/if}
	</div>
</article>

{#if explore.chordsSongKey}
	<SongChordsDrawer
		songId={explore.chordsSongKey}
		onClose={() => explore.openChords(undefined)}
		onPickSong={(songId) => {
			explore.openChords(songId);
			explore.searchSong(songId);
		}}
	/>
{/if}

<button
	class="mute-toggle"
	aria-label="Mute"
	aria-pressed={audio.muted}
	onclick={() => (audio.muted = !audio.muted)}
>
	{@html audio.muted ? mutedSvg : unmutedSvg}
</button>

<style>
	.map-layer {
		position: fixed;
		inset: 0;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 400ms ease,
			visibility 0s 400ms;
	}

	.map-layer.visible {
		opacity: 1;
		visibility: visible;
		transition: opacity 400ms ease;
	}

	.map-layer.faded {
		opacity: 0.3;
	}

	article {
		position: relative;
		z-index: var(--z-top);
		height: 100svh;
		display: flex;
		flex-direction: column;
		pointer-events: none;
		overflow: clip;
	}

	article
		:global(
			:is(
				a,
				button,
				input,
				select,
				textarea,
				label,
				audio,
				video,
				[tabindex]:not([tabindex="-1"])
			)
		) {
		pointer-events: auto;
	}

	.text {
		width: 100%;
		max-width: var(--col-width);
		margin: 0 auto;
		pointer-events: auto;
		font-size: clamp(0.875rem, min(2.5svh, 4vw), 1.25rem);
		flex: none;
		transition: height 400ms ease;
	}

	.text-measure {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		visibility: hidden;
		pointer-events: none;
	}

	.text-inner {
		padding: 1rem;
		display: grid;
	}

	.text-inner > div {
		grid-area: 1 / 1;
	}

	.stage {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.main {
		flex: 1;
		min-height: 0;
	}

	.panel {
		flex: none;
		height: 30svh;
		pointer-events: auto;
	}

	/* holds the player's room without catching hovers meant for the map */
	.panel.empty {
		pointer-events: none;
	}

	/* the beeswarm below the chords sets the explore panel's height */
	.panel.explore {
		height: auto;
		min-height: 30svh;
		padding-bottom: 1rem;
	}

	.overlay {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		justify-content: center;
		background: var(--color-gray-800);
		padding: 1rem;
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.2),
			0 8px 16px rgba(0, 0, 0, 0.25),
			0 24px 48px rgba(0, 0, 0, 0.35),
			inset 0 0 0 1px rgba(255, 255, 255, 0.06);
		z-index: var(--z-overlay);
		opacity: 0;
		transition: opacity 0.3s;
		pointer-events: none;
		max-width: 100%;
		max-height: 80svh;
		overflow: scroll;
	}

	.overlay.list {
		height: 450px;
	}

	.overlay.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.text :global(button) {
		font-family: var(--font-mono);
	}

	/* room for inline cluster buttons, on slides whose text has them. Set
	   on each slide's own text, since the outgoing and incoming text briefly
	   overlap while they fade. */
	.text-inner > div:has(:global(button strong.progression)) {
		line-height: 2.2;
	}

	/* the cluster the map is on */
	.text :global(button.selected),
	.text :global(button.selected:hover) {
		background: var(--color-fg);
		color: var(--color-bg);
		border-color: var(--color-fg);
	}

	.text :global(ol) {
		font-size: var(--36px);
		font-family: var(--font-serif);
		margin-top: 3rem;
	}

	.text :global(s) {
		color: var(--color-fg-light);
		text-decoration: line-through 0.1em var(--color-fg);
	}

	.text :global(li:has(s))::marker {
		color: var(--color-fg-light);
	}

	.text :global(span.small) {
		font-size: var(--12px);
		opacity: 0.75;
	}

	.text :global(h2) {
		font-family: var(--font-serif);
		font-weight: bold;
	}

	.mute-toggle {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: var(--z-overlay);
		width: 2.5rem;
		height: 2.5rem;
		padding: 0.375rem;
	}

	.mute-toggle[aria-pressed="true"] {
		background: var(--color-gray-200);
		border-color: var(--color-gray-200);
		color: var(--color-gray-900);
	}

	.mute-toggle[aria-pressed="true"]:hover {
		background: var(--color-gray-300);
		border-color: var(--color-gray-300);
	}

	.mute-toggle :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		fill: currentColor;
	}
</style>

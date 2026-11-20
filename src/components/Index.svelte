<script>
	import { MediaQuery } from "svelte/reactivity";
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
	import IntroHints from "$components/IntroHints.svelte";
	import List from "$components/List.svelte";
	import Footer from "$components/Footer.svelte";
	import Methods from "$components/Methods.svelte";
	import CMS from "$components/helpers/CMS.svelte";
	import { fade } from "svelte/transition";
	import copy from "$data/copy.json";
	import { parseMapScene, STAGE_SCENE } from "$components/storymap/mapScene";
	import { chordify } from "$utils/chordify";
	import { onMount, setContext } from "svelte";
	import { storyMedia } from "$runes/storyMedia.svelte";
	import { videoCues } from "$data/videoCues";
	import { createExplore } from "$runes/explore.svelte";
	import { sameClusterName } from "$data/clusterName";
	import { spanStyle } from "$routes/demo/record/timelineStyles";
	import { audio, stopAllAudio } from "$runes/audio.svelte";
	import { songDots } from "$runes/songDots.svelte";
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (1/4): see src/utils/slideParam.js. Delete this import.
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

	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (2/4): when removing, change the next line
	// to `$state(0)`.
	let slideI = $state(readSlideParam(allSlides.length));
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (3/4): delete the next line entirely.
	$effect(() => writeSlideParam(slideI));
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (4/4): the server renders slide 0 and
	// hydration keeps its {@html}, so ?slide=N re-renders the text once mounted.
	// Delete these lines and the `{#key textRemount}` wrapper below.
	let textRemount = $state(false);
	onMount(() => {
		if (slideI !== 0) textRemount = true;
	});
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

	// The slide this one was reached from (null on the first one shown).
	let previousSlideI = $state(null);
	let movedForward = $derived(
		previousSlideI === null || slideI > previousSlideI
	);
	let stageIsNew = $derived(
		previousSlideI === null ||
			allSlides[previousSlideI].stage?.component !== stageComponentName
	);

	// a <button><strong class=progression> in the text refocuses the map on
	// that cluster; the slide's own focusCluster comes back on the next visit
	let textFocusCluster = $state();
	// Going back, the map moves in one go, without the staged reveal.
	let mapScene = $derived.by(() => {
		const scene = parseMapScene(map);
		if (scene === null) return null;
		const staged = movedForward
			? scene
			: { ...scene, reveal: { clusters: [] } };
		return textFocusCluster === undefined
			? staged
			: { ...staged, camera: { kind: "cluster", name: textFocusCluster } };
	});
	// While followVideo plays: its current cue's song is spotlit and earlier
	// cues' songs stay lit.
	let followedCues = $derived(
		mapScene?.media.followVideo != null &&
			mapScene.media.followVideo === storyMedia.videoId
			? (videoCues[storyMedia.videoId] ?? null)
			: null
	);
	let mediaSpotlitSongKey = $derived(
		followedCues?.[storyMedia.cueIndex]?.songKey ?? null
	);
	const songKeysOf = (cues) =>
		cues.flatMap(({ songKey }) => (songKey === null ? [] : [songKey]));
	let litSongKeys = $derived.by(() => {
		const litVideo = mapScene?.media.litVideoSongs;
		if (litVideo) return songKeysOf(videoCues[litVideo] ?? []);
		if (!followedCues || storyMedia.cueIndex <= 0) return [];
		return songKeysOf(followedCues.slice(0, storyMedia.cueIndex));
	});
	// A slide's stage waits for the map's staged reveal (revealClusters), and
	// one that arrives going forward also for its songs' dots to reach it.
	let mapRevealRunning = $state(false);
	let stageWaits = $derived(
		(mapRevealRunning && (mapScene?.reveal.clusters.length ?? 0) > 0) ||
			(movedForward && stageIsNew && !songDots.arrived)
	);
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
		cameraJumps = false;
		textFocusCluster = cluster;
	};

	let textHeight = $state();
	// The text box as drawn, which lags textHeight while its height animates.
	let textBoxHeight = $state(0);
	// Incoming text only; textHeight also includes the outgoing text while it fades.
	let incomingTextHeight = $state(0);
	const TEXT_PADDING = 32;
	let clusterFrameEl = $state();
	let clusterFrameHeight = $state(0);
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

	let textBoxEl = $state();
	// Where the cluster frame ends once the text box finishes resizing, so the
	// map frames once instead of chasing the animation. Unrounded rects are read
	// together, then rounded, to avoid a pixel of wobble.
	let focusFrame = $derived.by(() => {
		void textBoxHeight;
		void clusterFrameHeight;
		if (!clusterFrameEl) return null;
		const frameRect = clusterFrameEl.getBoundingClientRect();
		const growth =
			text.length && incomingTextHeight && textBoxEl
				? Math.max(incomingTextHeight + TEXT_PADDING, reservedTextHeight) -
					textBoxEl.getBoundingClientRect().height
				: 0;
		const top = Math.round(frameRect.top + growth);
		const height = Math.round(frameRect.bottom) - top;
		return height > 0 ? { top, height } : null;
	});
	// Insets for rect-framed layouts: margin on the sides and bottom, gap below
	// the text box (or the stage video, which sits under it). "full" fills the screen.
	const MAP_FRAME_GAP = 12;
	const phone = new MediaQuery("(max-width: 600px)", false);
	let mapEdge = $derived(phone.current ? 8 : 14);
	let mapFrame = $derived({
		top:
			mapScene?.frame === "full" || !focusFrame
				? mapEdge
				: focusFrame.top +
					Math.max(0, storyMedia.videoBottomOffset) +
					MAP_FRAME_GAP,
		right: mapEdge,
		bottom: mapEdge,
		left: mapEdge
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
		get searchedSongKey() {
			return explore.searchedSongKey;
		}
	});

	// A new slide starts with nothing explored, playing or open, on its own
	// focusCluster.
	// Coming from a slide with no map, the map appears already on its
	// focusCluster instead of zooming there; every other move animates. Its
	// songs move there too, unless the map wasn't showing at all.
	let cameraJumps = $state(false);
	let layoutJumps = $state(false);
	const goToSlide = (i) => {
		if (i === slideI) return;
		cameraJumps = mapScene === null;
		layoutJumps = !mapShown;
		previousSlideI = slideI;
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
	// Songs a slide anchors are drawn over the page, so the map shows
	// whenever there are any, to let them travel to and from it.
	let mapShown = $derived(mapScene !== null || songDots.anchors.size > 0);
	let pinCanvasEl = $state();
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
	class:visible={mapShown}
	class:faded={overlay}
	aria-hidden={!mapShown}
>
	<HexMap
		scene={mapScene ?? STAGE_SCENE}
		{focusFrame}
		{mapFrame}
		instantCamera={cameraJumps}
		instantLayout={layoutJumps}
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
		spotlitSongKey={mediaSpotlitSongKey}
		{litSongKeys}
		onStagedRevealChange={(running) => (mapRevealRunning = running)}
		onExploredTitleAnchor={(anchor) => (titleAnchor = anchor)}
		pinCanvas={pinCanvasEl}
	/>
</div>

<svelte:window onclick={onWindowClick} />

<!-- Played by clicking their dots; the progress ring is the only UI -->
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
			bind:this={textBoxEl}
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
				<!-- DEV-ONLY-REMOVE-BEFORE-PUBLISH (4/4): unwrap this key block -->
				{#key textRemount}
					{#key text}
						<div
							in:fade={{ delay: 200, duration: 250 }}
							out:fade={{ duration: 150 }}
							bind:clientHeight={incomingTextHeight}
							{@attach chordify}
						>
							<CMS content={text} {components} />
						</div>
					{/key}
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
			{#key StageComponent}
				<div
					class="stage-slot"
					class:awaiting-map={stageWaits}
					out:fade={{ duration: 250 }}
				>
					{#if StageComponent}
						<!-- a fresh <video>/<track> per video, or the old track's cues linger -->
						{#key stageProps.videoId}
							<StageComponent {...stageProps} onStage />
						{/key}
					{/if}
				</div>
			{/key}
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

<canvas class="song-pins" bind:this={pinCanvasEl} aria-hidden="true"></canvas>

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

<IntroHints {slideI} />

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
		transition:
			height 400ms ease,
			opacity 400ms ease;
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

	/* one cell, so an outgoing stage fades out over the incoming one */
	.main {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1fr);
	}

	.stage-slot {
		grid-area: 1 / 1;
		min-height: 0;
		transition: opacity 400ms ease;
	}

	/* hidden at once, then faded in once the map and dots are there */
	.stage-slot.awaiting-map {
		opacity: 0;
		visibility: hidden;
		transition: none;
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

	.song-pins {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: calc(var(--z-top) + 1);
		pointer-events: none;
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

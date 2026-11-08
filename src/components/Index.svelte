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
	import SongChordsDrawer from "$components/SongChordsDrawer.svelte";
	import UltimateGuitar from "$components/UltimateGuitar.svelte";
	import RomanNumerals from "$components/RomanNumerals.svelte";
	import EffectiveBar from "$components/EffectiveBar.svelte";
	import ChordShares from "$components/ChordShares.svelte";
	import EffectiveDecades from "$components/EffectiveDecades.svelte";
	import ClusterPercentOverTime from "$components/ClusterPercentOverTime.svelte";
	import EffectiveProgressions from "$components/EffectiveProgressions.svelte";
	import Signatures from "$components/Signatures.svelte";
	import ExploreControls from "$components/ExploreControls.svelte";
	import List from "$components/List.svelte";
	import Footer from "$components/Footer.svelte";
	import CMS from "$components/helpers/CMS.svelte";
	import { fade } from "svelte/transition";
	import copy from "$data/copy.json";
	import { chordify } from "$utils/chordify";
	import { setContext } from "svelte";
	import { createExplore } from "$runes/explore.svelte";
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

	const parseBoolean = (value) =>
		value === undefined ? undefined : String(value).trim() === "true";

	const mapPropsFromCopy = (map) => {
		const props = {
			focusCluster: map.focusCluster?.trim() || undefined,
			showLabels: map.showLabels
				? String(map.showLabels)
						.split(",")
						.map((name) => name.trim())
						.filter(Boolean)
				: undefined,
			movable: parseBoolean(map.movable),
			hoverable: parseBoolean(map.hoverable),
			hideLabels: parseBoolean(map.hideLabels),
			rotateLabels: parseBoolean(map.rotateLabels),
			centered: parseBoolean(map.centered)
		};
		return Object.fromEntries(
			Object.entries(props).filter(([, value]) => value !== undefined)
		);
	};

	// a <button><strong class=progression> in the text refocuses the map on
	// that cluster; the slide's own focusCluster comes back on the next visit
	let textFocusCluster = $state();
	let mapProps = $derived.by(() => {
		if (!parseBoolean(map?.visible)) return null;
		const props = mapPropsFromCopy(map);
		return textFocusCluster === undefined
			? props
			: { ...props, focusCluster: textFocusCluster };
	});

	const onTextClick = (event) => {
		const strong = event.target
			.closest("button")
			?.querySelector("strong.progression, strong.progressions");
		const cluster = strong?.textContent.trim();
		if (cluster) textFocusCluster = cluster;
	};

	let textHeight = $state();
	let clusterFrameEl = $state();
	let clusterFrameHeight = $state(0);
	let focusFrame = $derived(
		clusterFrameEl && clusterFrameHeight > 0
			? { top: clusterFrameEl.offsetTop, height: clusterFrameHeight }
			: null
	);
	// What's explored, playing and open (see explore.svelte.ts). On the
	// explore slide any clicked cluster opens the panel and only panning or
	// zooming closes it; elsewhere only clusters with samples open it.
	const explore = createExplore({
		get exploreSlide() {
			return onExploreSlide;
		}
	});
	let activeCluster = $derived(mapProps?.focusCluster ?? explore.clusterName);
	let showClusterPanel = $derived(activeCluster !== undefined);

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
		pickSong: explore.searchSong,
		pickCluster: (clusterName) => explore.pickCluster(clusterName)
	});

	// A new slide starts with nothing explored, playing or open, on its own
	// focusCluster.
	const goToSlide = (i) => {
		if (i === slideI) return;
		slideI = i;
		textFocusCluster = undefined;
		explore.reset();
	};

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
	class:visible={mapProps !== null}
	class:faded={overlay}
	aria-hidden={mapProps === null}
>
	<HexMap
		{...mapProps ?? {}}
		{focusFrame}
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

<article bind:this={articleEl}>
	<Chapters
		activeSlide={slideI}
		sections={sections.slice(1)}
		onselect={goToSlide}
	/>

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
			style:height={textHeight ? `${textHeight}px` : null}
			in:fade={{ duration: 250 }}
		>
			<div class="text-inner" bind:clientHeight={textHeight}>
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
				in:fade={{ duration: 300, delay: 800 }}
			>
				<!-- keeps the player's room while it's drawn under its cluster -->
				<div
					class="player-slot"
					style:min-height={playerAnchor ? `${playerHeight}px` : null}
				>
					<Player
						cluster={activeCluster}
						bind:playingSongKey={explore.playingSongKey}
						bind:height={playerHeight}
						anchor={playerAnchor}
					/>
				</div>
				{#if onExploreSlide}
					<ClusterBeeswarm
						cluster={activeCluster}
						playingSongKey={explore.playingSongKey ?? null}
						mapHoveredSongKey={hoveredOnMap}
						selectedSongKey={explore.chordsSongKey ?? null}
						onHoverSong={(songKey) => (hoveredInBeeswarm = songKey)}
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

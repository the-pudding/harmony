<script>
	import Chapters from "$components/Chapters.svelte";
	import Landing from "$components/Landing.svelte";
	import HexMap from "$components/HexMap.svelte";
	import Tap from "$components/helpers/Tap.svelte";
	import Slider from "$components/helpers/Slider.svelte";
	import Slide from "$components/helpers/Slider.Slide.svelte";
	import Video from "$components/Video.svelte";
	import Player from "$components/Player.svelte";
	import EffectiveBar from "$components/EffectiveBar.svelte";
	import EffectiveDecades from "$components/EffectiveDecades.svelte";
	import List from "$components/List.svelte";
	import CMS from "$components/helpers/CMS.svelte";
	import { fade } from "svelte/transition";
	import copy from "$data/copy.json";
	import _ from "lodash";
	import { chordify } from "$utils/chordify";
	import { setContext } from "svelte";
	import { spanStyle } from "$routes/demo/design/timelineStyles";

	const debugSlide = 21;

	const components = {
		Landing,
		Video,
		List,
		EffectiveBar,
		EffectiveDecades
	};

	let slideCount = 0;
	const sections = copy.sections.map((section) => ({
		...section,
		slides: section.slides.map((s) => ({ ...s, i: slideCount++ }))
	}));
	const allSlides = sections
		.map((d, i) => d.slides.map((s) => ({ ...s, section: i })))
		.flat();

	let slideI = $state(debugSlide || 0);
	let { text, stage, overlay, map } = $derived(allSlides[slideI]);
	let { component: stageComponentName, ...stageProps } = $derived(stage ?? {});
	let { component: overlayComponentName, ...overlayProps } = $derived(
		overlay ?? {}
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

	let mapProps = $derived(
		parseBoolean(map?.visible) ? mapPropsFromCopy(map) : null
	);

	let textHeight = $state();
	let clusterFrameEl = $state();
	let clusterFrameHeight = $state(0);
	let focusFrame = $derived(
		clusterFrameEl && clusterFrameHeight > 0
			? { top: clusterFrameEl.offsetTop, height: clusterFrameHeight }
			: null
	);
	let showClusterPanel = $derived(mapProps?.focusCluster !== undefined);

	const onTap = (dir) => {
		if (debugSlide) return;
		if (dir === "right" && slideI < allSlides.length - 1) {
			slideI += 1;
		} else if (dir === "left" && slideI > 0) {
			slideI -= 1;
		}
	};
</script>

<Tap
	ontap={onTap}
	size="64px"
	showArrows
	disable={[
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
	<HexMap {...mapProps ?? {}} {focusFrame} theme="dark" />
</div>

<article>
	<Chapters
		visible={slideI > 0}
		activeSlide={slideI}
		sections={sections.slice(1)}
	/>

	<div class="overlay" class:visible={OverlayComponent}>
		{#if OverlayComponent}
			<OverlayComponent {...overlayProps} />
		{/if}
	</div>

	{#if text.length}
		<div
			class="text frosted"
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
						<CMS content={text} />
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
				<StageComponent {...stageProps} />
			{/if}
		</div>

		{#if showClusterPanel}
			<div class="panel" in:fade={{ duration: 300, delay: 800 }}>
				<Player cluster={mapProps.focusCluster} />
			</div>
		{/if}
	</div>
</article>

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
		width: 600px;
		height: 450px;
		max-width: 100%;
		max-height: 80svh;
		overflow: scroll;
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
	}

	.text :global(span.small) {
		font-size: var(--12px);
		opacity: 0.75;
	}
</style>

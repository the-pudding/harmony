<script>
	import Chapters from "$components/Chapters.svelte";
	import Landing from "$components/Landing.svelte";
	import HexMap from "$components/HexMap.svelte";
	import Tap from "$components/helpers/Tap.svelte";
	import Slider from "$components/helpers/Slider.svelte";
	import Slide from "$components/helpers/Slider.Slide.svelte";
	import Video from "$components/Video.svelte";
	import List from "$components/List.svelte";
	import CMS from "$components/helpers/CMS.svelte";
	import { fade } from "svelte/transition";
	import copy from "$data/copy.json";
	import _ from "lodash";
	import { setContext } from "svelte";

	const debugSlide = undefined; //13;

	const components = {
		Landing,
		Video,
		List
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
	let { text, stage, map } = $derived(allSlides[slideI]);
	let { component, ...stageProps } = $derived(stage ?? {});
	let StageComponent = $derived(
		component ? (components[_.capitalize(component)] ?? null) : null
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
		// Leave unset props out so HexMap's own defaults apply.
		return Object.fromEntries(
			Object.entries(props).filter(([, value]) => value !== undefined)
		);
	};

	let mapProps = $derived(
		parseBoolean(map?.visible) ? mapPropsFromCopy(map) : null
	);

	let textHeight = $state();

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
	aria-hidden={mapProps === null}
>
	<HexMap {...mapProps ?? {}} theme="dark" />
</div>

<article>
	<Chapters
		visible={slideI > 0}
		activeSlide={slideI}
		sections={sections.slice(1)}
	/>

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
					>
						<CMS content={text} />
					</div>
				{/key}
			</div>
		</div>
	{/if}

	<div class="stage">
		{#if StageComponent}
			<StageComponent {...stageProps} />
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
	}

	.text :global(button) {
		font-family: var(--font-mono);
	}

	.text :global(ol) {
		font-size: var(--36px);
		font-family: var(--font-serif);
	}
</style>

<script>
	import Chapters from "$components/Chapters.svelte";
	import Landing from "$components/Landing.svelte";
	import HexMap from "$components/HexMap.svelte";
	import Tap from "$components/helpers/Tap.svelte";
	import Slider from "$components/helpers/Slider.svelte";
	import Slide from "$components/helpers/Slider.Slide.svelte";
	import Video from "$components/Video.svelte";
	import CMS from "$components/helpers/CMS.svelte";
	import { fade } from "svelte/transition";
	import copy from "$data/copy.json";
	import _ from "lodash";

	const components = {
		Landing,
		Video
	};

	let slideCount = 0;
	const sections = copy.sections.map((section) => ({
		...section,
		slides: section.slides.map((s) => ({ ...s, i: slideCount++ }))
	}));
	const allSlides = sections
		.map((d, i) => d.slides.map((s) => ({ ...s, section: i })))
		.flat();

	let slideI = $state(0);
	let { text, stage } = $derived(allSlides[slideI]);
	let { component, ...stageProps } = $derived(stage ?? {});
	let StageComponent = $derived(
		component ? (components[_.capitalize(component)] ?? null) : null
	);

	// One HexMap stays mounted behind every slide, so moving between map
	// slides flies the same map to a new focus instead of reloading it.
	// Landing uses it as a backdrop; "map" stages set its props from the doc
	// (focusCluster, showLabels as a comma-separated list, and true/false for
	// movable, hoverable, hideLabels and rotateLabels).
	const LANDING_MAP_PROPS = {
		movable: false,
		hoverable: false,
		rotateLabels: true
	};

	const parseBoolean = (value) =>
		value === undefined ? undefined : String(value).trim() === "true";

	const mapPropsFromStage = (stage) => {
		const props = {
			focusCluster: stage.focusCluster?.trim() || undefined,
			showLabels: stage.showLabels
				? String(stage.showLabels)
						.split(",")
						.map((name) => name.trim())
						.filter(Boolean)
				: undefined,
			movable: parseBoolean(stage.movable),
			hoverable: parseBoolean(stage.hoverable),
			hideLabels: parseBoolean(stage.hideLabels),
			rotateLabels: parseBoolean(stage.rotateLabels)
		};
		// Leave unset props out so HexMap's own defaults apply.
		return Object.fromEntries(
			Object.entries(props).filter(([, value]) => value !== undefined)
		);
	};

	let mapProps = $derived(
		component === "landing"
			? LANDING_MAP_PROPS
			: component === "map"
				? mapPropsFromStage(stageProps)
				: null
	);

	let textHeight = $state();

	const onTap = (dir) => {
		if (dir === "right" && slideI < allSlides.length - 1) {
			slideI += 1;
		} else if (dir === "left" && slideI > 0) {
			slideI -= 1;
		}
	};
</script>

<Tap
	ontap={onTap}
	full
	size={slideI === 0 ? "100%" : ["33%", "67%"]}
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
			class="text"
			style:height={textHeight ? `${textHeight}px` : null}
			in:fade={{ duration: 250 }}
		>
			<div class="text-inner" bind:clientHeight={textHeight}>
				{#key text}
					<div
						class="text-content"
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
		font-size: clamp(0.875rem, min(2.5svh, 4vw), 1.25rem);
		flex: none;
		overflow: hidden;
		transition: height 400ms ease;
	}

	.text-inner {
		padding: 2.5rem 1rem 0rem 1rem;
		display: grid;
	}

	.text-content {
		grid-area: 1 / 1;
	}

	.stage {
		flex: 1;
		min-height: 0;
	}

	:global(article > .text button) {
		font-family: Atlas Typewriter;
	}

	:global(span.chord) {
		font-family: Atlas Typewriter;
	}
</style>

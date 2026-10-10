<script>
	import Landing from "$components/Landing.svelte";
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

	let slideI = $state(0);
	let { text, stage } = $derived(copy.slides[slideI]);
	let { component, ...stageProps } = $derived(stage ?? {});
	let StageComponent = $derived(
		component ? (components[_.capitalize(component)] ?? null) : null
	);

	let textHeight = $state();

	const onTap = (dir) => {
		if (dir === "right" && slideI < copy.slides.length - 1) {
			slideI += 1;
		} else if (dir === "left" && slideI > 0) {
			slideI -= 1;
		}
	};
</script>

<Tap ontap={onTap} full size={["50%", "50%"]} enableKeyboard={true} />

<article>
	<div class="text" style:height={textHeight ? `${textHeight}px` : null}>
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

	<div class="stage">
		{#if StageComponent}
			<StageComponent {...stageProps} />
		{/if}
	</div>
</article>

<style>
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
		padding: 2rem 1rem 0rem 1rem;
		display: grid;
	}

	.text-content {
		grid-area: 1 / 1;
	}

	.stage {
		flex: 1;
		min-height: 0;
	}
</style>

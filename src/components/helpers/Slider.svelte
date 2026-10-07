<!--
Add the css snippet below to your global css file to do a 
full-screen + mobile friendly slider
	
html, body, main {
	height: 100%;
	overflow: hidden;
}

Usage:
<script lang="ts">
	import Slider from "$components/helpers/Slider.svelte";
	import Slide from "$components/helpers/Slider.Slide.svelte";

	let sliderEl; // component binding
	let current = $state(0);

	sliderEl.next(); // navigation call
</script>

<Slider bind:this={sliderEl} bind:current>
	<Slide index={0}>
		<p>content</p>
	</Slide>
</Slider>
-->
<script lang="ts" module>
	export type SliderContext = {
		readonly dir: "horizontal" | "vertical";
		readonly cur: number;
		readonly count: number;
	};
</script>

<script lang="ts">
	import { setContext, onMount, type Snippet } from "svelte";

	interface Props {
		direction?: "horizontal" | "vertical";
		duration?: string;
		timing?: string;
		count?: number;
		current?: number;
		children?: Snippet;
	}

	let {
		direction = "horizontal",
		duration = "500ms",
		timing = "ease",
		count = $bindable(0),
		current = $bindable(0),
		children
	}: Props = $props();

	export const next = () => move(1);
	export const prev = () => move(-1);
	export const jump = (val: number) => move(val, true);

	let numSlides = $state(0);
	let isInView = false;
	let sliderEl: HTMLElement;
	let translateEl: HTMLElement;

	const move = (val: number, jump?: boolean) => {
		if (!isInView) return false;
		const target = jump ? val : current + val;
		current = Math.max(0, Math.min(numSlides - 1, target));
	};

	const onIntersect: IntersectionObserverCallback = (e) => {
		isInView = e[0].isIntersecting;
	};

	// percentages are relative to .slides (one slide's size), so no
	// measuring is needed and the first paint is already correct
	let x = $derived(direction === "horizontal" ? `${current * -100}%` : "0");
	let y = $derived(direction === "vertical" ? `${current * -100}%` : "0");

	setContext<SliderContext>("Slider", {
		get dir() {
			return direction;
		},
		get cur() {
			return current;
		},
		get count() {
			return count;
		}
	});

	onMount(() => {
		numSlides = translateEl.children.length;
		count = numSlides;
		const observer = new IntersectionObserver(onIntersect, {
			root: null,
			rootMargin: "-1px"
		});
		observer.observe(sliderEl);
		return () => observer.disconnect();
	});
</script>

<section
	aria-label="carousel"
	class="slider {direction}"
	bind:this={sliderEl}
>
	<div
		class="slides"
		bind:this={translateEl}
		style:transform="translate3d({x}, {y}, 0)"
		style:transition-duration={duration}
		style:transition-timing-function={timing}
	>
		{@render children?.()}
	</div>
</section>

<style>
	section {
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		z-index: 1;
		overflow: hidden;
	}

	.slides {
		display: flex;
		flex-wrap: nowrap;
		position: relative;
		width: 100%;
		height: 100%;
		transition-property: transform;
		z-index: 1;
	}

	.horizontal > .slides {
		flex-direction: row;
	}

	.vertical > .slides {
		flex-direction: column;
	}
</style>

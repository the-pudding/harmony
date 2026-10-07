<script lang="ts">
	import { getContext, type Snippet } from "svelte";
	import canTab from "$actions/canTab";
	import type { SliderContext } from "$components/helpers/Slider.svelte";

	interface Props {
		index: number;
		children?: Snippet;
	}

	let { index, children }: Props = $props();

	const slider = getContext<SliderContext>("Slider");

	let visible = $derived(index === slider.cur);
	let disable = $derived(!visible);
</script>

<div
	id="slide-{index}"
	class="slide"
	class:visible
	role="group"
	aria-label="slide {index + 1} of {slider.count}"
	aria-current={visible}
	use:canTab={{ disable }}
>
	{@render children?.()}
</div>

<style>
	.slide {
		position: relative;
		flex: 0 0 100%;
		width: 100%;
		height: 100%;
	}
</style>

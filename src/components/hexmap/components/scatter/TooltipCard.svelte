<script lang="ts">
	import { untrack, type Snippet } from "svelte";
	import { hoverCardVerticalShift } from "$routes/demo/shared/hoverCardPosition.js";

	// The floating card every map tooltip sits in, positioned by style
	// (see hoverCardStyle) in the map's coordinates. It's moved to <body> so
	// it sits above everything on the page, including what's drawn over the
	// map from outside it (like the explored cluster's title and chords).
	let { style, children }: { style: string; children: Snippet } = $props();

	// Stays in the map, at its top-left corner, to say where the map is.
	let originEl: HTMLSpanElement | undefined = $state();
	let el: HTMLDivElement | undefined = $state();
	let origin = $state({ x: 0, y: 0 });
	let shift = $state(0);

	const toBody = (node: HTMLElement) => {
		document.body.appendChild(node);
		return () => node.remove();
	};

	// Measure the map's position and the real card (its height varies), and
	// nudge the card into the window. Runs before paint, and again when the
	// content resizes.
	$effect(() => {
		void style;
		if (!el || !originEl) return;
		const node = el;
		const originNode = originEl;
		const measure = () => {
			const rect = node.getBoundingClientRect();
			const originRect = originNode.getBoundingClientRect();
			// The rect includes the current offset; swap it for the map's
			// current position to get the card's natural top in the window.
			const naturalTop = rect.top - origin.y - shift + originRect.top;
			origin = { x: originRect.left, y: originRect.top };
			shift = hoverCardVerticalShift(
				naturalTop,
				rect.height,
				window.innerHeight
			);
		};
		untrack(measure);
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	});
</script>

<span class="origin" bind:this={originEl} aria-hidden="true"></span>

<div
	bind:this={el}
	{@attach toBody}
	class="scatter-tooltip"
	style="{style} transform: translate({origin.x}px, {origin.y + shift}px);"
>
	{@render children()}
</div>

<style>
	.origin {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.scatter-tooltip {
		position: fixed;
		pointer-events: none;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		z-index: calc(var(--z-overlay, 100) + 10);
		backdrop-filter: blur(8px);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}
</style>

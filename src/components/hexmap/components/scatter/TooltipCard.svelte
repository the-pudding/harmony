<script lang="ts">
	import { untrack, type Snippet } from "svelte";
	import { hoverCardVerticalShift } from "$routes/demo/shared/hoverCardPosition.js";

	// The floating card every map tooltip sits in, positioned by style
	// (see hoverCardStyle).
	let { style, children }: { style: string; children: Snippet } = $props();

	let el: HTMLDivElement | undefined = $state();
	let shift = $state(0);

	// Measure the real card (its height varies) and nudge it into the window.
	// Runs before paint, and again when the content resizes.
	$effect(() => {
		void style;
		if (!el) return;
		const node = el;
		const measure = () => {
			const rect = node.getBoundingClientRect();
			// The rect includes the current shift; take it out to get the natural top.
			shift = hoverCardVerticalShift(
				rect.top - shift,
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

<div
	bind:this={el}
	class="scatter-tooltip"
	style="{style}{shift ? ` transform: translateY(${shift}px);` : ''}"
>
	{@render children()}
</div>

<style>
	.scatter-tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		z-index: 10;
		backdrop-filter: blur(8px);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}
</style>

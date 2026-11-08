<script lang="ts">
	import type { Snippet } from "svelte";

	// The floating card every map tooltip sits in, positioned by style
	// (see hoverCardStyle).
	let { style, children }: { style: string; children: Snippet } = $props();
</script>

<div class="scatter-tooltip" {style}>
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

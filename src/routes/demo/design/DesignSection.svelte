<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		children: Snippet;
	};

	let { title, children }: Props = $props();
</script>

<section class="design-section">
	<h2 class="section-title">{title}</h2>
	{@render children()}
</section>

<style>
	.design-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #a1a1aa;
		margin: 0;
	}
</style>

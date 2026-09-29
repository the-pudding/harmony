<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		description?: string;
		children: Snippet;
	};

	const { title, description, children }: Props = $props();
</script>

<section class="section">
	<div class="section-header">
		<h2 class="section-title">{title}</h2>
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
	</div>
	{@render children()}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		max-width: 48rem;
	}

	.section-title {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.section-description {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #a1a1aa;
	}
</style>

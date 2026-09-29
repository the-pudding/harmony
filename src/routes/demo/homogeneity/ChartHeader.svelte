<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};

	const { title, description }: Props = $props();
</script>

<div class="chart-header">
	<h3 class="chart-title">{title}</h3>
	{#if description}
		<p class="chart-description">{description}</p>
	{/if}
</div>

<style>
	.chart-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.chart-title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.chart-description {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.5;
		color: #a1a1aa;
		max-width: 42rem;
	}
</style>

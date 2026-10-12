<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		creditLabel: string;
		creditUrl: string;
		children: Snippet;
	};

	let { title, creditLabel, creditUrl, children }: Props = $props();
</script>

<div class="panel">
	<div class="header">
		<h3 class="title">{title}</h3>
		<p class="credit">
			Adapted from
			<a href={creditUrl} target="_blank" rel="noopener noreferrer"
				>{creditLabel}</a
			>
		</p>
	</div>
	{@render children()}
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		border-radius: 0.5rem;
		background: #ffffff;
		color: #18181b;
		isolation: isolate;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.credit {
		margin: 0;
		font-size: 0.75rem;
		color: #52525b;
	}

	.credit a {
		color: #0c96da;
	}
</style>

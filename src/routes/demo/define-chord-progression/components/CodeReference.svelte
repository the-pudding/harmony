<script lang="ts">
	type Props = {
		filename: string;
		symbols?: readonly string[];
	};

	let { filename, symbols = [] }: Props = $props();

	const hasSymbols = $derived(symbols.length > 0);
</script>

{#if hasSymbols}
	<div class="code-source">
		<code class="code-file">{filename}</code>
		<span class="code-symbols">
			{#each symbols as symbol (symbol)}
				<code class="code-symbol">{symbol}</code>
			{/each}
		</span>
	</div>
{:else}
	<code class="code-file">{filename}</code>
{/if}

<style>
	.code-source {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.code-file {
		font-size: 0.6875rem;
		font-weight: 500;
		color: #71717a;
		background: transparent;
		padding: 0;
	}

	.code-symbols {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.code-symbol {
		font-size: 0.75rem;
		font-weight: 500;
		color: #93c5fd;
		background: rgba(147, 197, 253, 0.08);
		padding: 0.05rem 0.3rem;
		border-radius: 0.2rem;
	}
</style>

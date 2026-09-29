<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		headers: string[];
		minWidth: string;
		children: Snippet;
	};

	const { headers, minWidth, children }: Props = $props();
</script>

<div class="table-wrap">
	<table class="data-table" style:min-width={minWidth}>
		<thead>
			<tr>
				{#each headers as header (header)}
					<th>{header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{@render children()}
		</tbody>
	</table>
</div>

<style>
	.table-wrap {
		overflow-x: auto;
		border: 1px solid rgba(63, 63, 70, 0.7);
		border-radius: 0.5rem;
	}

	.data-table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.75rem;
	}

	th {
		text-align: left;
		font-weight: 600;
		color: #a1a1aa;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.9);
		white-space: nowrap;
	}

	.data-table :global(td) {
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid rgba(39, 39, 42, 0.8);
		color: #d4d4d8;
	}

	.data-table :global(tbody tr:hover) {
		background: rgba(24, 24, 27, 0.6);
	}

	.data-table :global(.numeric) {
		font-variant-numeric: tabular-nums;
	}

	.data-table :global(.nowrap) {
		white-space: nowrap;
	}

	.data-table :global(.strong) {
		font-weight: 600;
		color: #f4f4f5;
	}

	.data-table :global(.muted) {
		color: #71717a;
	}

	.data-table :global(.band-dot) {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		margin-right: 0.375rem;
		border-radius: 9999px;
	}
</style>

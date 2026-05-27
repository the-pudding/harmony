<script lang="ts">
	import EventLogLine from "./EventLogLine.svelte";
	import type { EventLogEntry } from "./types.js";
	import { EVENT_LOG_EMPTY } from "./constants.js";

	let {
		entries,
		onClear
	}: {
		entries: EventLogEntry[];
		onClear: () => void;
	} = $props();
</script>

<section class="card">
	<div class="head">
		<h2>Event Log</h2>
		<button type="button" class="clear" onclick={onClear}>Clear</button>
	</div>
	<div class="log">
		{#if entries.length === 0}
			<span class="empty">{EVENT_LOG_EMPTY}</span>
		{:else}
			{#each entries as entry (entry.id)}
				<EventLogLine {entry} />
			{/each}
		{/if}
	</div>
</section>

<style>
	.card {
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		margin: 0;
	}

	.clear {
		font-size: 0.75rem;
		color: #71717a;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.clear:hover {
		color: #d4d4d8;
	}

	.log {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		font-size: 0.75rem;
		max-height: 16rem;
		overflow-y: auto;
		color: #71717a;
	}

	.empty {
		font-style: italic;
	}
</style>

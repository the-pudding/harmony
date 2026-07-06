<script lang="ts">
	import NoteDisplay from "./NoteDisplay.svelte";
	import type { EventLogEntry } from "./types.js";

	let { entry }: { entry: EventLogEntry } = $props();
</script>

<div class="line">
	{#if entry.kind === "start"}
		<span class="start">▶ start:</span>
		<span class="name">{entry.chordName}</span>
		<span class="detail">
			— <NoteDisplay note={entry.chordEvent.bassNote} /> /
			{#each entry.chordEvent.trebleNotes as note, i}
				{#if i > 0},
				{/if}
				<NoteDisplay {note} />
			{/each}
		</span>
	{:else if entry.kind === "end"}
		<span class="end-label">■ end:</span>
		<span class="end-name">{entry.chordName}</span>
	{:else if entry.kind === "connected"}
		<span class="connected">● connected</span>
	{:else if entry.kind === "disconnected"}
		<span class="disconnected">○ disconnected</span>
	{:else if entry.kind === "switched"}
		<span class="switched">⇄ switched to</span>
		<span class="switch-name">{entry.inputName}</span>
	{/if}
</div>

<style>
	.line {
		font-size: 0.75rem;
	}

	.start {
		color: #818cf8;
	}

	.name {
		color: #fff;
		font-weight: 500;
	}

	.detail {
		color: #71717a;
	}

	.end-label {
		color: #71717a;
	}

	.end-name {
		color: #d4d4d8;
	}

	.connected {
		color: #4ade80;
	}

	.disconnected {
		color: #71717a;
	}

	.switched {
		color: #a1a1aa;
	}

	.switch-name {
		color: #fff;
	}
</style>

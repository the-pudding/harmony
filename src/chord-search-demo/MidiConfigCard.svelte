<script lang="ts">
	import {
		DEFAULT_SETTLE_MS,
		DEFAULT_SPLIT_NOTE,
		SETTLE_MS_MAX,
		SETTLE_MS_MIN
	} from "./constants.js";

	let {
		splitNote,
		settleMs,
		isConnected,
		connectError,
		onSplitNoteChange,
		onSettleMsChange,
		onConnect,
		onDisconnect
	}: {
		splitNote: string;
		settleMs: number;
		isConnected: boolean;
		connectError: string;
		onSplitNoteChange: (value: string) => void;
		onSettleMsChange: (value: number) => void;
		onConnect: () => void;
		onDisconnect: () => void;
	} = $props();
</script>

<section class="card">
	<h2>Configuration</h2>
	<div class="grid">
		<label>
			<span>Split note (bass / treble)</span>
			<input
				type="text"
				value={splitNote}
				placeholder={DEFAULT_SPLIT_NOTE}
				oninput={(e) => onSplitNoteChange((e.currentTarget as HTMLInputElement).value)}
			/>
		</label>
		<label>
			<span>Settle delay (ms)</span>
			<input
				type="number"
				value={settleMs}
				min={SETTLE_MS_MIN}
				max={SETTLE_MS_MAX}
				oninput={(e) =>
					onSettleMsChange(parseInt((e.currentTarget as HTMLInputElement).value, 10))}
			/>
		</label>
	</div>
	<div class="actions">
		{#if !isConnected}
			<button type="button" class="primary" onclick={onConnect}>Connect MIDI</button>
		{:else}
			<button type="button" class="secondary" onclick={onDisconnect}>Disconnect</button>
		{/if}
		{#if connectError}
			<span class="error">{connectError}</span>
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
		gap: 1rem;
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		margin: 0;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	label span {
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	input {
		width: 100%;
		background: #27272a;
		border: 1px solid #3f3f46;
		border-radius: 0.25rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: #fff;
		font-family: inherit;
	}

	input:focus {
		outline: none;
		border-color: #71717a;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.primary {
		background: #4f46e5;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.primary:hover {
		background: #6366f1;
	}

	.secondary {
		background: #3f3f46;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.secondary:hover {
		background: #52525b;
	}

	.error {
		color: #f87171;
		font-size: 0.75rem;
	}
</style>

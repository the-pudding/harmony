<script lang="ts">
	type Props = {
		isConnected: boolean;
		selectedInputName: string;
		connectError: string;
		onConnect?: () => void | Promise<void>;
	};

	let { isConnected, selectedInputName, connectError, onConnect }: Props =
		$props();
</script>

<div class="midi-status">
	{#if isConnected}
		<span class="connected" title={selectedInputName}>connected</span>
	{:else}
		<button type="button" class="connect" onclick={onConnect}>connect</button>
	{/if}
	{#if connectError}
		<span class="connect-error">{connectError}</span>
	{/if}
</div>

<style>
	.midi-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.connected {
		font-size: 0.75rem;
		font-weight: 500;
		color: #4ade80;
		text-transform: lowercase;
		cursor: default;
	}

	.connect {
		font-size: 0.75rem;
		font-weight: 500;
		color: #a1a1aa;
		background: transparent;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		font-family: inherit;
		text-transform: lowercase;
	}

	.connect:hover {
		color: #e4e4e7;
		border-color: #52525b;
	}

	.connect-error {
		font-size: 0.625rem;
		color: #f87171;
		max-width: 12rem;
		text-align: right;
	}
</style>

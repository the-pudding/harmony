<script lang="ts">
	import type { MidiDeviceInfo } from "../chord-processing/types.js";

	let { device }: { device: MidiDeviceInfo } = $props();
</script>

<div class="device" class:active={device.isActive}>
	<div class="top">
		<span class="name">{device.name || "Unknown device"}</span>
		{#if device.isActive}
			<span class="badge">active</span>
		{/if}
	</div>
	<div class="meta">
		{#if device.manufacturer}
			<span>Manufacturer: <span class="val">{device.manufacturer}</span></span>
		{/if}
		<span
			>State: <span class="val" class:connected={device.state === "connected"}
				>{device.state}</span
			></span
		>
		<span>Connection: <span class="val">{device.connection}</span></span>
		{#if device.version}
			<span>Version: <span class="val">{device.version}</span></span>
		{/if}
		<span class="id">ID: <span class="id-val">{device.id}</span></span>
	</div>
</div>

<style>
	.device {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border: 1px solid #27272a;
		border-radius: 0.25rem;
		padding: 0.75rem;
	}

	.device.active {
		border-color: #4338ca;
		background: rgba(30, 27, 75, 0.3);
	}

	.top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		flex-wrap: wrap;
	}

	.name {
		color: #fff;
		font-weight: 500;
	}

	.badge {
		color: #818cf8;
		font-size: 0.75rem;
		border: 1px solid #4338ca;
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
	}

	.meta {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.25rem 1rem;
		font-size: 0.75rem;
		color: #71717a;
		width: 100%;
	}

	.val {
		color: #a1a1aa;
	}

	.val.connected {
		color: #4ade80;
	}

	.id {
		grid-column: span 2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.id-val {
		color: #52525b;
	}
</style>

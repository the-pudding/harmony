<script lang="ts">
	type Props = {
		zoom: number;
		canZoomOut: boolean;
		canZoomIn: boolean;
		onZoomOut: () => void;
		onZoomIn: () => void;
	};

	let { zoom, canZoomOut, canZoomIn, onZoomOut, onZoomIn }: Props = $props();
</script>

<div class="zoom-controls">
	<button
		type="button"
		aria-label="Zoom out"
		disabled={!canZoomOut}
		onclick={onZoomOut}>−</button
	>
	<span class="zoom-level">{zoom}×</span>
	<button
		type="button"
		aria-label="Zoom in"
		disabled={!canZoomIn}
		onclick={onZoomIn}>+</button
	>
</div>

<style>
	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	button {
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: rgba(24, 24, 27, 0.6);
		color: #f4f4f5;
		font: inherit;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.zoom-level {
		min-width: 2rem;
		text-align: center;
	}
</style>

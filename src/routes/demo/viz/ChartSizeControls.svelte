<script lang="ts">
	type Props = {
		width: number;
		height: number;
		minWidth?: number;
		maxWidth?: number;
		minHeight?: number;
		maxHeight?: number;
	};

	let {
		width = $bindable(),
		height = $bindable(),
		minWidth = 120,
		maxWidth = 900,
		minHeight = 120,
		maxHeight = 1000
	}: Props = $props();
</script>

<div class="size-controls">
	<label class="size-control">
		<span class="size-label">width: {width}px</span>
		<input type="range" min={minWidth} max={maxWidth} step="10" bind:value={width} />
	</label>
	<label class="size-control">
		<span class="size-label">height: {height}px</span>
		<input type="range" min={minHeight} max={maxHeight} step="10" bind:value={height} />
	</label>
</div>

<style>
	.size-controls {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.size-control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.7rem;
		color: #52525b;
	}

	.size-label {
		font-variant-numeric: tabular-nums;
	}

	input[type="range"] {
		width: 180px;
		accent-color: cornflowerblue;
	}
</style>

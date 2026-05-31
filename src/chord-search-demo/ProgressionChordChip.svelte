<script lang="ts">
	let {
		name,
		originalDisplay,
		showOriginal
	}: {
		name: string;
		originalDisplay: string;
		showOriginal: boolean;
	} = $props();
</script>

<span class="chip-wrapper">
	<span class="mini-chip" class:hidden={!showOriginal}>{originalDisplay}</span>
	<span class="chip">{name}</span>
</span>

<style>
	.chip {
		background: rgba(30, 27, 75, 0.6);
		border: 1px solid rgba(67, 56, 202, 0.6);
		border-radius: 0.25rem;
		padding: 0.125rem 0.5rem;
	}

	.chip-wrapper {
		position: relative;
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.mini-chip {
		font-size: 0.48rem;
		padding: 0.05rem 0.2rem;
		color: #a5b4fc;
		white-space: nowrap;
		line-height: 1.3;
		margin-bottom: -2px;
	}

	.mini-chip.hidden {
		visibility: hidden;
	}
</style>

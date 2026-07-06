<script lang="ts">
	let top = $state<string | undefined>();
	let left = $state<string | undefined>();
	let {
		evt = {} as { detail?: { e: { layerY: number; layerX: number } } },
		offset = -35
	} = $props();

	$effect(() => {
		if (evt.detail) {
			top = `${evt.detail.e.layerY + offset}px`;
			left = `${evt.detail.e.layerX}px`;
		}
	});
</script>

{#if evt.detail}
	<div style:top style:left>
		<small>
			<slot detail={evt.detail} />
		</small>
	</div>
{/if}

<style>
	div {
		position: absolute;
		width: 10em;
		border: 1px solid var(--color-gray-300);
		background: var(--color-white);
		transform: translate(-50%, -100%);
		padding: 0.5em;
		z-index: var(--z-top);
	}
</style>

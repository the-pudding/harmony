<script lang="ts">
	import ClusterTitle from "$components/ClusterTitle.svelte";
	import type { ClusterTitleSpot } from "./clusterTitles.js";

	// Each cluster's small title under its outline at dot zoom (see
	// placeClusterTitles). With onSelect, clicking one picks its cluster,
	// like clicking its hex.
	let {
		titles,
		onSelect = null
	}: {
		titles: readonly ClusterTitleSpot[];
		onSelect?: ((name: string) => void) | null;
	} = $props();
</script>

{#each titles as title (title.hash)}
	{#if onSelect}
		<button
			class="title"
			style:left="{title.x}px"
			style:top="{title.y}px"
			aria-label="Explore {title.name}"
			onclick={(event) => {
				// the map underneath would treat it as a background click
				event.stopPropagation();
				onSelect(title.name);
			}}
		>
			<ClusterTitle cluster={title.name} size="small" />
		</button>
	{:else}
		<div class="title" style:left="{title.x}px" style:top="{title.y}px">
			<ClusterTitle cluster={title.name} size="small" />
		</div>
	{/if}
{/each}

<style>
	.title {
		position: absolute;
		transform: translateX(-50%);
		pointer-events: none;
	}

	button.title {
		all: unset;
		position: absolute;
		transform: translateX(-50%);
		pointer-events: auto;
		cursor: pointer;
		border-radius: 0.5rem;
		transition: opacity 150ms ease;
	}

	button.title:hover {
		opacity: 0.8;
	}

	button.title:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 4px;
	}
</style>

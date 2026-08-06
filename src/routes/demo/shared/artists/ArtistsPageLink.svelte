<script lang="ts">
	import type { Snippet } from "svelte";
	import {
		ARTISTS_PAGE_PATH,
		buildArtistsPageUrl
	} from "./artistsPagePath.js";

	const DEFAULT_LABEL = "artists page";
	const DEFAULT_ARTIST_LABEL = "open on artists page";

	type Props = {
		artistName?: string;
		children?: Snippet;
		class?: string;
	};

	const {
		artistName,
		children,
		class: className = ""
	}: Props = $props();

	const href = $derived(
		artistName !== undefined
			? buildArtistsPageUrl(artistName)
			: ARTISTS_PAGE_PATH
	);

	const defaultLabel = $derived(
		artistName !== undefined ? DEFAULT_ARTIST_LABEL : DEFAULT_LABEL
	);
</script>

<a {href} class={className} target="_blank" rel="noopener noreferrer">
	{#if children}
		{@render children()}
	{:else}
		{defaultLabel}
	{/if}
</a>

<script lang="ts">
	import { untrack } from "svelte";
	import { page } from "$app/state";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { createEmbeddingState } from "./embedding/state/createEmbeddingState.svelte.js";
	import {
		readHarmonyMapUrlState,
		replaceHarmonyMapStateInUrl
	} from "./harmonyMapUrlState.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import EmbeddingView from "./views/EmbeddingView.svelte";

	const initialUrlState = readHarmonyMapUrlState(currentSearchParams());

	const coverage = createAllSongsCoverageState();

	const embedding = createEmbeddingState({
		getEntries: () => coverage.allSongsCoverageResult?.songCoverages ?? null,
		initialMethod: initialUrlState.method,
		onMethodChange: (method) => replaceHarmonyMapStateInUrl({ method })
	});

	$effect(() => {
		page.url.search;
		untrack(() => {
			const urlState = readHarmonyMapUrlState(page.url.searchParams);
			embedding.setMethod(urlState.method);
			replaceHarmonyMapStateInUrl(urlState);
		});
	});

	const songCoverages = $derived(
		coverage.allSongsCoverageResult?.songCoverages ?? []
	);

	const statusText = $derived.by(() => {
		if (coverage.loading) return "Loading song dataset…";
		if (coverage.loadError) return coverage.loadError;
		return `${coverage.baseList.length.toLocaleString()} songs`;
	});

	const isError = $derived(Boolean(coverage.loadError));

	const loadingText = $derived(
		coverage.loading ? "Loading songs…" : "Computing coverage…"
	);
</script>

<svelte:head>
	<title>harmony — harmony map</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

{#snippet corpusControls()}
	<span class="status-text" class:error={isError}>{statusText}</span>
{/snippet}

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="page-body">
		{#if coverage.allSongsCoverageResult}
			<EmbeddingView
				{songCoverages}
				songs={coverage.baseList}
				{embedding}
				trailingControls={corpusControls}
			/>
		{:else}
			<div class="loading-toolbar">
				{@render corpusControls()}
			</div>
			<div class="loading-overlay">
				<span class="loading-text">{loadingText}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
		overflow: hidden;
	}

	.page-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 1rem 0 0;
		gap: 0.75rem;
		box-sizing: border-box;
		position: relative;
	}

	.loading-toolbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		flex-shrink: 0;
		padding: 0 1.25rem;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.loading-overlay {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	.loading-text {
		font-size: 0.75rem;
		color: #52525b;
	}
</style>

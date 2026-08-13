<script lang="ts">
	import { untrack } from "svelte";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import ToggleSwitch from "../../../../chord-search-demo/ToggleSwitch.svelte";
	import ArtistGroupMix from "./ArtistGroupMix.svelte";
	import ArtistSongTimeline from "./ArtistSongTimeline.svelte";
	import ArtistStatsFacts from "./ArtistStatsFacts.svelte";
	import ArtistTopProgressions from "./ArtistTopProgressions.svelte";
	import type { ArtistSummary, YearDomain } from "./artistStats.js";
	import { createArtistFullCatalogState } from "./createArtistFullCatalogState.svelte.js";

	type Props = {
		summary: ArtistSummary;
		songByKey: Map<string, GroupedSong>;
		yearDomain?: YearDomain | null;
		selectedSongKey?: string | null;
		progressionLimit: number;
		highlightedProgressions?: string[] | null;
		onSelectSong: (songKey: string) => void;
		onSelectProgression?: (chordProgression: string) => void;
		layout?: "stacked" | "split";
		timelineTooltipVariant?: "rich" | "compact";
		catalogSlug?: string | null;
	};

	const {
		summary,
		songByKey,
		yearDomain = null,
		selectedSongKey = null,
		progressionLimit,
		highlightedProgressions = null,
		onSelectSong,
		onSelectProgression,
		layout = "stacked",
		timelineTooltipVariant = "rich",
		catalogSlug = null
	}: Props = $props();

	// One state instance per artist row — catalogSlug/summary.artistName don't
	// change over this component's lifetime (each row is keyed by artist name).
	const catalogState = untrack(() =>
		catalogSlug !== null
			? createArtistFullCatalogState(catalogSlug, summary.artistName)
			: null
	);

	let showFullCatalog = $state(false);

	$effect(() => {
		if (showFullCatalog) catalogState?.load();
	});

	const timelineSongs = $derived(
		showFullCatalog && catalogState?.summary
			? catalogState.summary.songs
			: summary.songs
	);

	const timelineSongByKey = $derived(
		showFullCatalog && catalogState
			? catalogState.songByKey
			: songByKey
	);
</script>

<div class="profile" class:profile-split={layout === "split"}>
	<ArtistStatsFacts {summary} layout={layout === "split" ? "row" : "column"} />

	<div class="panels">
		<section class="panel">
			<h4 class="panel-title">core progression groups</h4>
			<ArtistGroupMix
				groupStats={summary.groupStats}
				songCount={summary.songCount}
			/>
		</section>

		<section class="panel">
			<h4 class="panel-title">top core progressions</h4>
			<ArtistTopProgressions
				progressions={summary.topProgressions}
				limit={progressionLimit}
				{highlightedProgressions}
				{onSelectProgression}
			/>
		</section>

		<section class="panel panel-timeline">
			<div class="panel-title-row">
				<h4 class="panel-title">songs over time</h4>
				{#if catalogSlug !== null}
					<div class="catalog-toggle">
						<ToggleSwitch
							checked={showFullCatalog}
							onchange={(checked) => (showFullCatalog = checked)}
							label="full catalog"
						/>
						{#if showFullCatalog && catalogState?.loading}
							<span class="catalog-status">loading…</span>
						{:else if showFullCatalog && catalogState?.error}
							<span class="catalog-status catalog-status-error"
								>{catalogState.error}</span
							>
						{:else if showFullCatalog && catalogState?.summary}
							<span class="catalog-status"
								>{catalogState.summary.songCount.toLocaleString()} songs</span
							>
						{/if}
					</div>
				{/if}
			</div>
			<ArtistSongTimeline
				songs={timelineSongs}
				songByKey={timelineSongByKey}
				{yearDomain}
				{selectedSongKey}
				{highlightedProgressions}
				{onSelectSong}
				tooltipVariant={timelineTooltipVariant}
			/>
		</section>
	</div>
</div>

<style>
	.profile {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	.panels {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		min-width: 0;
	}

	.profile-split .panels {
		display: grid;
		grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
		grid-template-areas:
			"groups timeline"
			"progressions timeline";
		gap: 0.875rem 1.5rem;
		align-items: start;
	}

	.profile-split .panel:nth-child(1) {
		grid-area: groups;
	}

	.profile-split .panel:nth-child(2) {
		grid-area: progressions;
	}

	.profile-split .panel-timeline {
		grid-area: timeline;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
	}

	.panel-title {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.panel-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.catalog-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.catalog-status {
		font-size: 0.6rem;
		color: #71717a;
	}

	.catalog-status-error {
		color: #fca5a5;
	}
</style>

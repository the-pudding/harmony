<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import ArtistGroupMix from "./ArtistGroupMix.svelte";
	import ArtistSongTimeline from "./ArtistSongTimeline.svelte";
	import ArtistStatsFacts from "./ArtistStatsFacts.svelte";
	import ArtistTopProgressions from "./ArtistTopProgressions.svelte";
	import type { ArtistSummary, YearDomain } from "./artistStats.js";

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
		timelineMaxHeight?: number;
		timelineTooltipVariant?: "rich" | "compact";
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
		timelineMaxHeight,
		timelineTooltipVariant = "rich"
	}: Props = $props();
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
			<h4 class="panel-title">songs over time</h4>
			<ArtistSongTimeline
				songs={summary.songs}
				{songByKey}
				{yearDomain}
				{selectedSongKey}
				{highlightedProgressions}
				{onSelectSong}
				maxHeight={timelineMaxHeight}
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
</style>

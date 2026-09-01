<script lang="ts">
	import {
		colorForProgressionGroupName,
		type ProgressionGroup
	} from "$data/core-progressions.js";
	import {
		chordProgressionVariants,
		siblingVariantsForProgression
	} from "$data/core-progressions.util.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import type { AllSongsCoverageResult } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import { filterCoverageResultForProgressions } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import CoreProgressionRow from "../define-chord-progression/components/CoreProgressionRow.svelte";
	import SongCoverageBeeswarm from "../define-chord-progression/components/SongCoverageBeeswarm.svelte";
	import SongReleaseTimeline from "../define-chord-progression/components/SongReleaseTimeline.svelte";
	import type { YearDomain } from "../shared/artists/artistStats.js";
	import CorpusMatchRateOverTimeChart from "./CorpusMatchRateOverTimeChart.svelte";

	type Props = {
		group: ProgressionGroup;
		coverageResult: AllSongsCoverageResult | null;
		songByKey: ReadonlyMap<string, GroupedSong>;
		yearDomain: YearDomain | null;
		pinnedProgression: string | null;
		selectedSongKey: string;
		onSelectProgression: (p: string) => void;
		onSelectSong: (key: string) => void;
	};

	let {
		group,
		coverageResult,
		songByKey,
		yearDomain,
		pinnedProgression,
		selectedSongKey,
		onSelectProgression,
		onSelectSong
	}: Props = $props();

	const groupProgressionKeys = $derived(
		group.progressions.flatMap((p) =>
			chordProgressionVariants(p.chordProgression)
		)
	);

	const filteredCoverage = $derived(
		coverageResult
			? filterCoverageResultForProgressions(
					coverageResult,
					groupProgressionKeys
				)
			: null
	);

	const groupMatchingSongCount = $derived(
		filteredCoverage?.songCoverages.length ?? 0
	);
	const totalSongCount = $derived(coverageResult?.songCoverages.length ?? 0);
	const groupMatchPercent = $derived(
		totalSongCount > 0
			? Math.round((groupMatchingSongCount / totalSongCount) * 100)
			: 0
	);

	const highlightedProgressions = $derived.by(() => {
		if (
			pinnedProgression === null ||
			!groupProgressionKeys.includes(pinnedProgression)
		) {
			return null;
		}
		return siblingVariantsForProgression(group.progressions, pinnedProgression);
	});

	const activeProgressionInGroup = $derived(
		highlightedProgressions !== null ? pinnedProgression : null
	);

	const corpusMatchProgressions = $derived(
		highlightedProgressions ?? groupProgressionKeys
	);

	const isSubGroup = $derived(group.parentGroupName !== undefined);
	const groupColor = $derived(colorForProgressionGroupName(group.name));

	const timelineSongs = $derived(
		filteredCoverage === null
			? null
			: filteredCoverage.songCoverages.map((song) => ({
					songKey: song.songKey,
					title: song.title,
					artists: song.artists,
					year: songByKey.get(song.songKey)?.year ?? null,
					coveragePercent: song.coveragePercent,
					matchingProgressions: song.matchingProgressions
				}))
	);
</script>

<section class="group-section" class:group-section-sub={isSubGroup}>
	<div class="group-header">
		{#if isSubGroup}
			<span class="group-sub-label">sub-family of {group.parentGroupName}</span>
		{/if}
		<h2 class="group-name">
			<span class="group-dot" style:background={groupColor}></span>
			{group.name}
			{#if coverageResult}
				<span class="group-stat"
					>— at least one of its progressions is matched in <span
						class="group-stat-value">{groupMatchPercent}% of all songs</span
					>
					<span class="group-stat-count"
						>({groupMatchingSongCount.toLocaleString()} songs)</span
					></span
				>
			{/if}
		</h2>
		{#if group.description}
			<p class="group-description">{group.description}</p>
		{/if}
	</div>

	<p class="match-note">
		match % = progression selected as final chord progression in each song (not
		just if it appears)
	</p>

	<CoreProgressionRow
		coreProgressions={group.progressions}
		selectedSong={null}
		activeProgression={activeProgressionInGroup}
		progressionMatchCounts={filteredCoverage?.progressionMatchCounts ?? null}
		songCoverages={coverageResult?.songCoverages ?? null}
		{totalSongCount}
		onselect={onSelectProgression}
	/>

	<SongCoverageBeeswarm
		songs={filteredCoverage?.songCoverages ?? null}
		{songByKey}
		{selectedSongKey}
		{highlightedProgressions}
		{onSelectSong}
	/>

	<SongReleaseTimeline
		songs={timelineSongs}
		{songByKey}
		{selectedSongKey}
		{highlightedProgressions}
		{yearDomain}
		{onSelectSong}
	/>

	<CorpusMatchRateOverTimeChart
		corpusSongs={coverageResult?.songCoverages ?? null}
		{songByKey}
		matchProgressions={corpusMatchProgressions}
		filtered={highlightedProgressions !== null}
		{yearDomain}
	/>
</section>

<style>
	.group-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.group-section-sub {
		padding-left: 1.25rem;
		border-left: 2px solid rgba(63, 63, 70, 0.7);
		margin-left: 0.25rem;
	}

	.group-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-sub-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.group-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		color: white;
	}

	.group-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.group-stat {
		font-size: 0.8125rem;
		font-weight: 400;
		color: #71717a;
	}

	.group-stat-value {
		color: #f4f4f5;
	}

	.group-stat-count {
		color: rgba(161, 161, 170, 0.55);
	}

	.group-description {
		font-size: 0.8125rem;
		color: #71717a;
		margin: 0;
		line-height: 1.5;
	}

	.match-note {
		font-size: 0.75rem;
		color: #52525b;
		margin: 0;
		line-height: 1.5;
	}
</style>

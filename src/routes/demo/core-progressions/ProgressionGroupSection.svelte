<script lang="ts">
	import type { ProgressionGroup } from "$data/core-progressions.js";
	import {
		chordProgressionVariants,
		siblingVariantsForProgression
	} from "$data/core-progressions.util.js";
	import type { AllSongsCoverageResult } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import { filterCoverageResultForProgressions } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import CoreProgressionRow from "../define-chord-progression/components/CoreProgressionRow.svelte";
	import SongCoverageBeeswarm from "../define-chord-progression/components/SongCoverageBeeswarm.svelte";

	const BEESWARM_HEIGHT = 125;

	type Props = {
		group: ProgressionGroup;
		coverageResult: AllSongsCoverageResult | null;
		pinnedProgression: string | null;
		selectedSongKey: string;
		onSelectProgression: (p: string) => void;
		onSelectSong: (key: string) => void;
	};

	let {
		group,
		coverageResult,
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

	const highlightedProgressions = $derived(
		pinnedProgression
			? siblingVariantsForProgression(group.progressions, pinnedProgression)
			: null
	);
</script>

<section class="group-section">
	<div class="group-header">
		<h2 class="group-name">
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
		activeProgression={pinnedProgression}
		progressionMatchCounts={filteredCoverage?.progressionMatchCounts ?? null}
		songCoverages={coverageResult?.songCoverages ?? null}
		{totalSongCount}
		onselect={onSelectProgression}
	/>

	<SongCoverageBeeswarm
		songs={filteredCoverage?.songCoverages ?? null}
		{selectedSongKey}
		{highlightedProgressions}
		{onSelectSong}
		maxHeight={BEESWARM_HEIGHT}
	/>
</section>

<style>
	.group-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.group-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-name {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		color: white;
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

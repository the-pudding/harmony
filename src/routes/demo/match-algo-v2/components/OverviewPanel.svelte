<script lang="ts">
	import { trickySongsToMatchCorrectly } from "../../../../data/hand-reviewed-songs.js";
	import { findGroupedSongByKey } from "../../../../data/songBrowserData.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { MatchWeights } from "../match-algo-v2-logic/weights.js";
	import type {
		AxisVerdict,
		CorpusComparison,
		CoverageBucket
	} from "../match-algo-v2-logic/compareCorpus.js";
	import type { SongPairMetrics } from "../match-algo-v2-logic/createAlgoComparisonState.svelte.js";
	import {
		formatCount,
		formatPercent,
		formatSharePercent,
		formatSignedInteger,
		formatSignedPercentPoints,
		formatSignedSharePercentPoints,
		formatSignedUnitLength,
		formatUnitLength,
		verdictLabel
	} from "../match-algo-v2-logic/formatComparison.js";
	import { PERCENT_MULTIPLIER } from "../match-algo-v2-logic/algoMetrics.js";
	import SongCompareHover from "./SongCompareHover.svelte";

	type Props = {
		comparison: CorpusComparison;
		pairs: SongPairMetrics[];
		isComputing: boolean;
		progressPercent: number;
		computedCount: number;
		totalCount: number;
		songs: GroupedSong[];
		weights: MatchWeights;
		onSelectSong: (songKey: string) => void;
	};

	const {
		comparison,
		pairs,
		isComputing,
		progressPercent,
		computedCount,
		totalCount,
		songs,
		weights,
		onSelectSong
	}: Props = $props();

	const HISTOGRAM_MIN_HEIGHT_PERCENT = 4;
	const STACK_MIN_SEGMENT_PERCENT = 0;
	const HIGH_COVERAGE_BUCKET_START = 50;
	const ACTIVATE_KEYS = new Set(["Enter", " "]);

	const openingAlignDelta = $derived(
		comparison.v2.meanOpeningPrefixAlignRate -
			comparison.v1.meanOpeningPrefixAlignRate
	);
	const interiorRunDelta = $derived(
		comparison.v2.meanInteriorUncoveredRuns -
			comparison.v1.meanInteriorUncoveredRuns
	);
	const length4PlusShareDelta = $derived(
		comparison.v2.length4PlusShareOfCovered -
			comparison.v1.length4PlusShareOfCovered
	);

	const trickyRows = $derived(
		trickySongsToMatchCorrectly.flatMap((entry) => {
			const pair = pairs.find((row) => row.songKey === entry.id);
			return pair
				? [{ ...pair, challenge: entry.chordMatchingChallenges }]
				: [];
		})
	);

	const histogramMax = $derived(
		Math.max(
			...comparison.coverageHistogram.flatMap((bucket) => [
				bucket.v1Count,
				bucket.v2Count
			]),
			1
		)
	);

	const barHeightPercent = (count: number): number =>
		count === 0
			? 0
			: Math.max(
					HISTOGRAM_MIN_HEIGHT_PERCENT,
					(count / histogramMax) * PERCENT_MULTIPLIER
				);

	const stackWidth = (percent: number): string =>
		`${Math.max(STACK_MIN_SEGMENT_PERCENT, percent)}%`;

	const deltaClass = (value: number): string => {
		if (value > 0) return "up";
		if (value < 0) return "down";
		return "flat";
	};

	const invertedDeltaClass = (value: number): string => {
		if (value < 0) return "up";
		if (value > 0) return "down";
		return "flat";
	};

	const bucketCountDelta = (bucket: CoverageBucket): number =>
		bucket.v2Count - bucket.v1Count;

	const bucketDeltaClass = (bucket: CoverageBucket): string => {
		const delta = bucketCountDelta(bucket);
		if (delta === 0) return "flat";
		const moreIsBetter = bucket.start >= HIGH_COVERAGE_BUCKET_START;
		const v2HasMore = delta > 0;
		return moreIsBetter === v2HasMore ? "up" : "down";
	};

	const songForKey = (songKey: string): GroupedSong | null =>
		findGroupedSongByKey(songs, songKey);

	const activateRow = (event: KeyboardEvent, songKey: string) => {
		if (!ACTIVATE_KEYS.has(event.key)) return;
		event.preventDefault();
		onSelectSong(songKey);
	};
</script>

{#snippet verdictChip(verdict: AxisVerdict)}
	<span class="verdict" class:better={verdict === "better"} class:worse={verdict === "worse"}>
		{verdictLabel(verdict)}
	</span>
{/snippet}

<section class="overview">
	{#if isComputing || totalCount > 0}
		<p class="progress-line">
			{#if isComputing}
				comparing {computedCount} / {totalCount} songs…
			{:else}
				compared {comparison.songCount} songs
			{/if}
		</p>
		<div class="progress-track" aria-hidden="true">
			<div class="progress-fill" style:width="{progressPercent}%"></div>
		</div>
	{/if}

	<section class="block">
		<h2 class="heading">Is v2 better?</h2>
		<p class="lede">
			v1 greedily maximizes coverage. v2 tiles from the start of each section.
			These corpus stats ask whether that trade is worth it — and where it
			backfires.
		</p>
		<div class="verdict-grid">
			<article class="card">
				<div class="card-top">
					<h3>Coverage</h3>
					{@render verdictChip(comparison.verdicts.coverage)}
				</div>
				<p class="stat">
					{formatPercent(comparison.v2.meanCoverage)}
					<span class="vs">vs v1 {formatPercent(comparison.v1.meanCoverage)}</span>
				</p>
				<p class={deltaClass(comparison.deltas.meanCoverage)}>
					{formatSignedPercentPoints(comparison.deltas.meanCoverage)} mean
				</p>
				<p class="winloss">
					{comparison.winLoss.v2HigherCoverage} songs up ·
					{comparison.winLoss.v2LowerCoverage} down ·
					{comparison.winLoss.coverageTie} tied
				</p>
			</article>
			<article class="card">
				<div class="card-top">
					<h3>Section starts</h3>
					{@render verdictChip(comparison.verdicts.sectionStarts)}
				</div>
				<p class="stat">
					{formatPercent(comparison.v2.meanSectionStartRate)}
					<span class="vs">vs v1 {formatPercent(comparison.v1.meanSectionStartRate)}</span>
				</p>
				<p class={deltaClass(comparison.deltas.meanSectionStartRate)}>
					{formatSignedPercentPoints(comparison.deltas.meanSectionStartRate)} of
					sections begin on a match
				</p>
				<p class="winloss">
					{comparison.winLoss.v2MoreSectionStarts} songs improved ·
					{comparison.winLoss.v2FewerSectionStarts} worse
				</p>
			</article>
			<article class="card">
				<div class="card-top">
					<h3>Interior holes</h3>
					{@render verdictChip(comparison.verdicts.interiorHoles)}
				</div>
				<p class="stat">
					{formatCount(comparison.v2.meanInteriorSingletons)}
					<span class="vs">vs v1 {formatCount(comparison.v1.meanInteriorSingletons)}</span>
				</p>
				<p class={invertedDeltaClass(comparison.deltas.meanInteriorSingletons)}>
					{formatSignedUnitLength(comparison.deltas.meanInteriorSingletons)}
					orphaned mid-section chords / song
				</p>
				<p class="winloss">
					{comparison.winLoss.v2FewerInteriorHoles} songs cleaner ·
					{comparison.winLoss.v2MoreInteriorHoles} messier
				</p>
			</article>
			<article class="card">
				<div class="card-top">
					<h3>3-chord greed</h3>
					{@render verdictChip(comparison.verdicts.shortGreedy)}
				</div>
				<p class="stat">
					{formatSharePercent(comparison.v2.length3ShareOfCovered)}
					<span class="vs">vs v1 {formatSharePercent(comparison.v1.length3ShareOfCovered)}</span>
				</p>
				<p class={invertedDeltaClass(comparison.deltas.length3ShareOfCovered)}>
					{formatSignedSharePercentPoints(comparison.deltas.length3ShareOfCovered)}
					share of covered chords from length-3 units
				</p>
				<p class="winloss">
					mean unit {formatUnitLength(comparison.v2.meanUnitLength)} vs
					{formatUnitLength(comparison.v1.meanUnitLength)}
				</p>
			</article>
		</div>
	</section>

	<section class="block split">
		<div>
			<h2 class="heading">Coverage distribution</h2>
			<p class="lede">Where songs land on explained %.</p>
			<p class={deltaClass(comparison.deltas.meanCoverage)}>
				{formatSignedPercentPoints(comparison.deltas.meanCoverage)} mean coverage
			</p>
			<div class="histogram">
				{#each comparison.coverageHistogram as bucket (bucket.start)}
					<div class="hist-col">
						<span class={bucketDeltaClass(bucket)}>
							{formatSignedInteger(bucketCountDelta(bucket))}
						</span>
						<div class="hist-bars">
							<div
								class="hist-bar v1"
								style:height="{barHeightPercent(bucket.v1Count)}%"
								title="v1 {bucket.label}: {bucket.v1Count}"
							></div>
							<div
								class="hist-bar v2"
								style:height="{barHeightPercent(bucket.v2Count)}%"
								title="v2 {bucket.label}: {bucket.v2Count}"
							></div>
						</div>
						<span class="hist-label">{bucket.start}</span>
					</div>
				{/each}
			</div>
			<p class="legend">
				<span><i class="swatch v1"></i>v1</span>
				<span><i class="swatch v2"></i>v2</span>
			</p>
		</div>
		<div>
			<h2 class="heading">Core vs non-core</h2>
			<p class="lede">Mean % of each song claimed by core progressions, gap-fill, or left unmatched.</p>
			<div class="stacks">
				<div class="stack-row">
					<span class="stack-name">v1</span>
					<div class="stack">
						<span
							class="seg core"
							style:width={stackWidth(comparison.v1.meanCoreCoverage)}
						></span>
						<span
							class="seg gap"
							style:width={stackWidth(comparison.v1.meanGapCoverage)}
						></span>
						<span
							class="seg none"
							style:width={stackWidth(comparison.v1.meanUncovered)}
						></span>
					</div>
					<span class="stack-nums">
						{formatPercent(comparison.v1.meanCoreCoverage)} /
						{formatPercent(comparison.v1.meanGapCoverage)} /
						{formatPercent(comparison.v1.meanUncovered)}
					</span>
				</div>
				<div class="stack-row">
					<span class="stack-name">v2</span>
					<div class="stack">
						<span
							class="seg core"
							style:width={stackWidth(comparison.v2.meanCoreCoverage)}
						></span>
						<span
							class="seg gap"
							style:width={stackWidth(comparison.v2.meanGapCoverage)}
						></span>
						<span
							class="seg none"
							style:width={stackWidth(comparison.v2.meanUncovered)}
						></span>
					</div>
					<span class="stack-nums">
						{formatPercent(comparison.v2.meanCoreCoverage)} /
						{formatPercent(comparison.v2.meanGapCoverage)} /
						{formatPercent(comparison.v2.meanUncovered)}
					</span>
				</div>
			</div>
			<p class="legend">
				<span><i class="swatch core"></i>core</span>
				<span><i class="swatch gap"></i>non-core</span>
				<span><i class="swatch none"></i>uncovered</span>
			</p>
		</div>
	</section>

	<section class="block">
		<h2 class="heading">Is it fixing how v1 failed?</h2>
		<div class="fail-grid">
			<article class="fail-card">
				<h3>Starts mid-section</h3>
				<p class="fail-copy">
					v1 can cherry-pick a window that does not begin the section. v2 is
					start-anchored, so opening-prefix alignment should rise.
				</p>
				<p class={deltaClass(openingAlignDelta)}>
					{formatSignedPercentPoints(openingAlignDelta)} opening aligned
				</p>
				<p class="stat-inline">
					{formatPercent(comparison.v2.meanOpeningPrefixAlignRate)} vs v1
					{formatPercent(comparison.v1.meanOpeningPrefixAlignRate)}
				</p>
			</article>
			<article class="fail-card">
				<h3>Orphan chords in the middle</h3>
				<p class="fail-copy">
					Greedy 3-chord cores leave a single unmatched chord between hits.
					Interior singletons and mid-section gaps should fall.
				</p>
				<p class={invertedDeltaClass(interiorRunDelta)}>
					{formatSignedUnitLength(interiorRunDelta)} interior runs / song
				</p>
				<p class="stat-inline">
					{formatCount(comparison.v2.meanInteriorUncoveredRuns)} vs v1
					{formatCount(comparison.v1.meanInteriorUncoveredRuns)}
				</p>
			</article>
			<article class="fail-card">
				<h3>Short core over true 4-chord loop</h3>
				<p class="fail-copy">
					Treasure / Let Her Go / Pocketful of Sunshine: v1 takes a 3-chord
					core because it covers more. Length-3 share should drop if v2
					keeps the fuller loop.
				</p>
				<p class={deltaClass(length4PlusShareDelta)}>
					{formatSignedSharePercentPoints(length4PlusShareDelta)} length ≥ 4
					share
				</p>
				<p class="stat-inline">
					{formatSharePercent(comparison.v2.length4PlusShareOfCovered)} vs v1
					{formatSharePercent(comparison.v1.length4PlusShareOfCovered)}
				</p>
			</article>
		</div>
	</section>

	<section class="block">
		<h2 class="heading">Known tricky songs</h2>
		<p class="lede">
			The hand-reviewed failure cases. Click a row to open it on the Tricky
			songs tab.
		</p>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Song</th>
						<th>Cover</th>
						<th>Starts</th>
						<th>Holes</th>
						<th>Unit</th>
						<th>Challenge</th>
					</tr>
				</thead>
				<tbody>
					{#each trickyRows as row (row.songKey)}
						<tr
							class="clickable-row"
							tabindex="0"
							role="link"
							onclick={() => onSelectSong(row.songKey)}
							onkeydown={(event) => activateRow(event, row.songKey)}
						>
							<td>
								<span class="song-link">{row.v2.title}</span>
							</td>
							<td class={deltaClass(row.v2.coveragePercent - row.v1.coveragePercent)}>
								{formatPercent(row.v2.coveragePercent)}
								<span class="tiny">v1 {formatPercent(row.v1.coveragePercent)}</span>
							</td>
							<td class={deltaClass(row.v2.sectionStartRate - row.v1.sectionStartRate)}>
								{formatPercent(row.v2.sectionStartRate)}
								<span class="tiny">v1 {formatPercent(row.v1.sectionStartRate)}</span>
							</td>
							<td class={invertedDeltaClass(row.v2.interiorSingletonCount - row.v1.interiorSingletonCount)}>
								{row.v2.interiorSingletonCount}
								<span class="tiny">v1 {row.v1.interiorSingletonCount}</span>
							</td>
							<td>
								{formatUnitLength(row.v2.meanUnitLength)}
								<span class="tiny">v1 {formatUnitLength(row.v1.meanUnitLength)}</span>
							</td>
							<td class="challenge">
								{row.challenge}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="block split">
		<div>
			<h2 class="heading">Where v2 is worse</h2>
			<p class="lede">Largest coverage drops. Tiling can leave a prefix leftover uncounted, or miss a greedy mid-section grab that happened to cover more.</p>
			<ul class="song-list">
				{#each comparison.worseByCoverage as row (row.songKey)}
					<li>
						<SongCompareHover
							song={songForKey(row.songKey)}
							{weights}
							align="start"
						>
							<button
								type="button"
								class="listed-song"
								onclick={() => onSelectSong(row.songKey)}
							>
								<span class="song-link">{row.title}</span>
								<span class="down">{formatSignedPercentPoints(row.coverageDelta)}</span>
							</button>
						</SongCompareHover>
					</li>
				{/each}
				{#if comparison.worseByCoverage.length === 0}
					<li class="empty">No material coverage drops yet.</li>
				{/if}
			</ul>
		</div>
		<div>
			<h2 class="heading">Where v2 is better</h2>
			<p class="lede">Largest coverage gains on the same corpus.</p>
			<ul class="song-list">
				{#each comparison.improvedByCoverage as row (row.songKey)}
					<li>
						<SongCompareHover
							song={songForKey(row.songKey)}
							{weights}
							align="end"
						>
							<button
								type="button"
								class="listed-song"
								onclick={() => onSelectSong(row.songKey)}
							>
								<span class="song-link">{row.title}</span>
								<span class="up">{formatSignedPercentPoints(row.coverageDelta)}</span>
							</button>
						</SongCompareHover>
					</li>
				{/each}
				{#if comparison.improvedByCoverage.length === 0}
					<li class="empty">No material coverage gains yet.</li>
				{/if}
			</ul>
		</div>
	</section>
</section>

<style>
	.overview {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		overflow: visible;
	}

	.progress-line {
		margin: 0;
		font-size: 0.7rem;
		color: #71717a;
	}

	.progress-track {
		height: 0.25rem;
		border-radius: 9999px;
		background: #18181b;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #818cf8;
		transition: width 0.2s ease;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		overflow: visible;
	}

	.heading {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #71717a;
	}

	.lede {
		margin: 0;
		font-size: 0.75rem;
		color: #a1a1aa;
		line-height: 1.5;
	}

	.verdict-grid,
	.fail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.card,
	.fail-card {
		padding: 0.9rem;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		background: #0c0c0e;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #e4e4e7;
	}

	.verdict {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.12rem 0.4rem;
		border-radius: 9999px;
		background: #18181b;
		color: #a1a1aa;
	}

	.verdict.better {
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
	}

	.verdict.worse {
		background: rgba(248, 113, 113, 0.12);
		color: #f87171;
	}

	.stat {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.vs,
	.winloss,
	.tiny {
		font-size: 0.65rem;
		font-weight: 400;
		color: #71717a;
	}

	.winloss,
	.stat-inline {
		margin: 0;
		font-size: 0.68rem;
		color: #a1a1aa;
		line-height: 1.4;
	}

	.up {
		color: #4ade80;
		font-size: 0.72rem;
		margin: 0;
	}

	.down {
		color: #f87171;
		font-size: 0.72rem;
		margin: 0;
	}

	.flat {
		color: #71717a;
		font-size: 0.72rem;
		margin: 0;
	}

	.histogram {
		display: flex;
		align-items: flex-end;
		gap: 0.35rem;
		height: 8.5rem;
		padding: 0.25rem 0 0;
	}

	.hist-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		height: 100%;
	}

	.hist-bars {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 0.15rem;
	}

	.hist-bar {
		width: 45%;
		border-radius: 0.15rem 0.15rem 0 0;
		min-height: 0;
	}

	.hist-bar.v1 {
		background: #52525b;
	}

	.hist-bar.v2 {
		background: #818cf8;
	}

	.hist-col > .up,
	.hist-col > .down,
	.hist-col > .flat {
		font-size: 0.55rem;
		font-weight: 600;
		min-height: 0.85rem;
	}

	.hist-label {
		font-size: 0.55rem;
		color: #52525b;
	}

	.legend {
		display: flex;
		gap: 0.85rem;
		margin: 0;
		font-size: 0.65rem;
		color: #71717a;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.swatch {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 0.1rem;
		display: inline-block;
	}

	.swatch.v1 {
		background: #52525b;
	}

	.swatch.v2,
	.hist-bar.v2 {
		background: #818cf8;
	}

	.swatch.core,
	.seg.core {
		background: #76b7b2;
	}

	.swatch.gap,
	.seg.gap {
		background: #e15759;
	}

	.swatch.none,
	.seg.none {
		background: #27272a;
	}

	.stacks {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stack-row {
		display: grid;
		grid-template-columns: 1.5rem 1fr auto;
		gap: 0.5rem;
		align-items: center;
	}

	.stack-name {
		font-size: 0.65rem;
		color: #a1a1aa;
	}

	.stack {
		display: flex;
		height: 0.7rem;
		border-radius: 9999px;
		overflow: hidden;
		background: #18181b;
	}

	.seg {
		display: block;
		height: 100%;
	}

	.stack-nums {
		font-size: 0.6rem;
		color: #71717a;
		white-space: nowrap;
	}

	.fail-copy {
		margin: 0;
		font-size: 0.72rem;
		color: #a1a1aa;
		line-height: 1.45;
	}

	.fail-card .up,
	.fail-card .down,
	.fail-card .flat {
		font-weight: 600;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.7rem;
	}

	th {
		text-align: left;
		font-weight: 600;
		color: #71717a;
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid #27272a;
	}

	td {
		padding: 0.55rem 0.5rem;
		border-bottom: 1px solid #18181b;
		vertical-align: top;
		color: #d4d4d8;
	}

	.clickable-row {
		cursor: pointer;
	}

	.clickable-row:hover,
	.clickable-row:focus-visible {
		background: rgba(255, 255, 255, 0.03);
	}

	.listed-song {
		appearance: none;
		border: none;
		background: none;
		padding: 0;
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		color: inherit;
		text-align: left;
	}

	.challenge {
		color: #71717a;
		line-height: 1.4;
		max-width: 22rem;
	}

	.tiny {
		display: block;
	}

	.song-link {
		appearance: none;
		border: none;
		background: none;
		padding: 0;
		color: #c7d2fe;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		text-align: left;
	}

	.song-link:hover {
		color: #e0e7ff;
		text-decoration: underline;
	}

	.song-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.song-list li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.75rem;
	}

	.empty {
		color: #52525b;
	}

	@media (max-width: 56rem) {
		.split,
		.verdict-grid,
		.fail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
	import { trickySongsToMatchCorrectly } from "../../../../data/hand-reviewed-songs.js";
	import { findGroupedSongByKey } from "../../../../data/songBrowserData.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { MatchWeights } from "../match-algo-v2-logic/weights.js";
	import type { CorpusComparison } from "../match-algo-v2-logic/compareCorpus.js";
	import type { SongPairMetrics } from "../match-algo-v2-logic/createAlgoComparisonState.svelte.js";
	import {
		formatCount,
		formatPercent,
		formatSharePercent,
		formatUnitLength
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
	const ACTIVATE_KEYS = new Set(["Enter", " "]);

	const trickyRows = $derived(
		trickySongsToMatchCorrectly.flatMap((entry) => {
			const pair = pairs.find((row) => row.songKey === entry.id);
			return pair
				? [{ ...pair.v2, challenge: entry.chordMatchingChallenges }]
				: [];
		})
	);

	const histogramMax = $derived(
		Math.max(...comparison.coverageHistogram.map((bucket) => bucket.count), 1)
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

	const songForKey = (songKey: string): GroupedSong | null =>
		findGroupedSongByKey(songs, songKey);

	const activateRow = (event: KeyboardEvent, songKey: string) => {
		if (!ACTIVATE_KEYS.has(event.key)) return;
		event.preventDefault();
		onSelectSong(songKey);
	};
</script>

<section class="overview">
	{#if isComputing || totalCount > 0}
		<p class="progress-line">
			{#if isComputing}
				scoring {computedCount} / {totalCount} songs…
			{:else}
				scored {comparison.songCount} songs
			{/if}
		</p>
		<div class="progress-track" aria-hidden="true">
			<div class="progress-fill" style:width="{progressPercent}%"></div>
		</div>
	{/if}

	<section class="block">
		<h2 class="heading">v2 corpus snapshot</h2>
		<p class="lede">
			Section-first tiling with default (or slider) weights. Prefix leftovers at
			a section end are expected; leftover iv-style holes between a 3-chord hit
			and the next covered section are counted.
		</p>
		<div class="verdict-grid">
			<article class="card">
				<h3>Coverage</h3>
				<p class="stat">{formatPercent(comparison.stats.meanCoverage)}</p>
				<p class="winloss">
					median {formatPercent(comparison.stats.medianCoverage)} · uncovered
					{formatPercent(comparison.stats.meanUncovered)}
				</p>
			</article>
			<article class="card">
				<h3>Section starts</h3>
				<p class="stat">{formatPercent(comparison.stats.meanSectionStartRate)}</p>
				<p class="winloss">
					opening aligned {formatPercent(comparison.stats.meanOpeningPrefixAlignRate)}
				</p>
			</article>
			<article class="card">
				<h3>Interior holes</h3>
				<p class="stat">{formatCount(comparison.stats.meanInteriorSingletons)}</p>
				<p class="winloss">
					{formatCount(comparison.stats.meanInteriorUncoveredRuns)} interior
					uncovered runs / song
				</p>
			</article>
			<article class="card">
				<h3>3-chord share</h3>
				<p class="stat">
					{formatSharePercent(comparison.stats.length3ShareOfCovered)}
				</p>
				<p class="winloss">
					mean unit {formatUnitLength(comparison.stats.meanUnitLength)} · length ≥
					4 {formatSharePercent(comparison.stats.length4PlusShareOfCovered)}
				</p>
			</article>
		</div>
	</section>

	<section class="block split">
		<div>
			<h2 class="heading">Coverage distribution</h2>
			<p class="lede">Where songs land on explained %.</p>
			<div class="histogram">
				{#each comparison.coverageHistogram as bucket (bucket.start)}
					<div class="hist-col">
						<div class="hist-bars">
							<div
								class="hist-bar v2"
								style:height="{barHeightPercent(bucket.count)}%"
								title="{bucket.label}: {bucket.count}"
							></div>
						</div>
						<span class="hist-label">{bucket.start}</span>
					</div>
				{/each}
			</div>
		</div>
		<div>
			<h2 class="heading">Core vs non-core</h2>
			<p class="lede">
				Mean % of each song claimed by core progressions, gap-fill, or left
				unmatched.
			</p>
			<div class="stacks">
				<div class="stack-row">
					<span class="stack-name">v2</span>
					<div class="stack">
						<span
							class="seg core"
							style:width={stackWidth(comparison.stats.meanCoreCoverage)}
						></span>
						<span
							class="seg gap"
							style:width={stackWidth(comparison.stats.meanGapCoverage)}
						></span>
						<span
							class="seg none"
							style:width={stackWidth(comparison.stats.meanUncovered)}
						></span>
					</div>
					<span class="stack-nums">
						{formatPercent(comparison.stats.meanCoreCoverage)} /
						{formatPercent(comparison.stats.meanGapCoverage)} /
						{formatPercent(comparison.stats.meanUncovered)}
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
								<span class="song-link">{row.title}</span>
							</td>
							<td>{formatPercent(row.coveragePercent)}</td>
							<td>{formatPercent(row.sectionStartRate)}</td>
							<td>{row.interiorSingletonCount}</td>
							<td>{formatUnitLength(row.meanUnitLength)}</td>
							<td class="challenge">{row.challenge}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="block split">
		<div>
			<h2 class="heading">Lowest coverage</h2>
			<p class="lede">
				Tiling can leave a prefix leftover uncounted, or miss a mid-section grab.
			</p>
			<ul class="song-list">
				{#each comparison.lowestCoverage as row (row.songKey)}
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
								<span class="down">{formatPercent(row.metrics.coveragePercent)}</span>
							</button>
						</SongCompareHover>
					</li>
				{/each}
				{#if comparison.lowestCoverage.length === 0}
					<li class="empty">No songs scored yet.</li>
				{/if}
			</ul>
		</div>
		<div>
			<h2 class="heading">Highest coverage</h2>
			<p class="lede">Songs where tiling explains the most chords.</p>
			<ul class="song-list">
				{#each comparison.highestCoverage as row (row.songKey)}
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
								<span class="up">{formatPercent(row.metrics.coveragePercent)}</span>
							</button>
						</SongCompareHover>
					</li>
				{/each}
				{#if comparison.highestCoverage.length === 0}
					<li class="empty">No songs scored yet.</li>
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

	.verdict-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.card {
		padding: 0.9rem;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		background: #0c0c0e;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	h3 {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #e4e4e7;
	}

	.stat {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.winloss {
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
	}

	.hist-bar {
		width: 55%;
		border-radius: 0.15rem 0.15rem 0 0;
		min-height: 0;
	}

	.hist-bar.v2 {
		background: #818cf8;
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
		.verdict-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

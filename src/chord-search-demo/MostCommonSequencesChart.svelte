<script lang="ts">
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import { isRomanTokenPositionHighlighted } from "./searchMatchesInRomanTokens.js";
	import type { VariableGramStat } from "./computeVariableGramStats.js";
	import type { AbstractProgression } from "../chord-processing/types.js";
	import {
		FOUR_CHORDS_PROGRESSION_LABEL,
		SEQUENCE_CHART_BAR_HEIGHT_PX,
		SEQUENCE_CHART_BAR_MIN_WIDTH_PX,
		SEQUENCE_CHART_BAR_TRACK_HEIGHT_RATIO,
		SEQUENCE_CHART_CHORD_SEPARATOR,
		SEQUENCE_CHART_AVG_PCT_BAR_COLOR,
		SEQUENCE_CHART_FALLBACK_BAR_COLOR,
		SEQUENCE_CHART_HIGHLIGHT_COLOR,
		SEQUENCE_CHART_LENGTH_COLORS,
		SEQUENCE_CHART_LOADING_MESSAGE,
		SEQUENCE_CHART_COL_WEIGHTS,
		SEQUENCE_CHART_SONG_APPEARANCES_COL_HEADER,
		sequenceChartColWidthPercent,
		formatSequenceChartOccurrences,
		formatSequenceChartPercent,
		SEQUENCE_CHART_TABLE_MARGIN_PX,
		SEQUENCE_CHART_VIEWPORT_HEIGHT_PX
	} from "./constants.js";

	const CORPUS_SONG_COUNT_FALLBACK = 1;
	const PERCENT_SCALE = 100;

	type Props = {
		chartData: VariableGramStat[];
		isLoading: boolean;
		hasSearchChords: boolean;
		searchAbstract: AbstractProgression | null;
		fuzzySearch: boolean;
		matchAtBeginningOnly: boolean;
		matchAtLeastTwice: boolean;
	};

	let {
		chartData,
		isLoading,
		hasSearchChords,
		searchAbstract,
		fuzzySearch,
		matchAtBeginningOnly,
		matchAtLeastTwice
	}: Props = $props();

	const MIN_BAR_WIDTH_PERCENT = 0;
	const MAX_BAR_WIDTH_PERCENT = 100;
	const ONE_BASED_RANK_OFFSET = 1;
	const TOOLTIP_X_OFFSET_PX = 12;
	const TOOLTIP_Y_OFFSET_PX = -8;

	const songs = $derived(chordSearchDemoStore.songs);
	const totalUnfilteredSongCount = $derived(
		Math.max(songs.length, CORPUS_SONG_COUNT_FALLBACK)
	);

	const parseLabelChords = (label: string) =>
		label.split(SEQUENCE_CHART_CHORD_SEPARATOR);

	const pctOfAllSongs = (songCount: number) =>
		(songCount / totalUnfilteredSongCount) * PERCENT_SCALE;

	const formatPctOfAllSongs = (songCount: number) =>
		formatSequenceChartPercent(pctOfAllSongs(songCount));

	const songAppearancesAriaLabel = (row: VariableGramStat) =>
		`${formatPctOfAllSongs(row.songCount)}% (${formatSequenceChartOccurrences(row.songCount)}) of all songs`;

	const barWidthFromPercent = (percent: number) =>
		Math.min(
			MAX_BAR_WIDTH_PERCENT,
			Math.max(MIN_BAR_WIDTH_PERCENT, percent)
		);

	const formatAvgPctOfSong = (row: VariableGramStat) =>
		`${Math.round(row.avgPctOfSong)}%`;

	const barColor = (label: string, length: number) =>
		label === FOUR_CHORDS_PROGRESSION_LABEL
			? SEQUENCE_CHART_HIGHLIGHT_COLOR
			: (SEQUENCE_CHART_LENGTH_COLORS[length] ??
				SEQUENCE_CHART_FALLBACK_BAR_COLOR);

	let tooltip = $state<{
		label: string;
		songCount: number;
		pctOfAllSongs: number;
		avgPctOfSong: number;
		length: number;
		x: number;
		y: number;
	} | null>(null);

	const showTooltip = (event: MouseEvent, row: VariableGramStat) => {
		tooltip = {
			label: row.label,
			songCount: row.songCount,
			pctOfAllSongs: pctOfAllSongs(row.songCount),
			avgPctOfSong: row.avgPctOfSong,
			length: row.length,
			x: event.offsetX,
			y: event.offsetY
		};
	};

	const hideTooltip = () => {
		tooltip = null;
	};

	const rankColWidth = sequenceChartColWidthPercent(
		SEQUENCE_CHART_COL_WEIGHTS.rank
	);
	const sequenceColWidth = sequenceChartColWidthPercent(
		SEQUENCE_CHART_COL_WEIGHTS.sequence
	);
	const avgPctColWidth = sequenceChartColWidthPercent(
		SEQUENCE_CHART_COL_WEIGHTS.avgPct
	);
	const barColWidth = sequenceChartColWidthPercent(
		SEQUENCE_CHART_COL_WEIGHTS.bar
	);
</script>

<div
	class="chart-wrap"
	class:is-loading={isLoading}
	style:height="{SEQUENCE_CHART_VIEWPORT_HEIGHT_PX}px"
	style:margin="{SEQUENCE_CHART_TABLE_MARGIN_PX}px"
	style:--bar-height="{SEQUENCE_CHART_BAR_HEIGHT_PX}px"
	style:--bar-track-height-ratio={SEQUENCE_CHART_BAR_TRACK_HEIGHT_RATIO}
	style:--bar-min-width="{SEQUENCE_CHART_BAR_MIN_WIDTH_PX}px"
>
	<table class="sequence-table" aria-busy={isLoading}>
		<colgroup>
			<col class="rank-col" style:width={rankColWidth} />
			<col class="sequence-col" style:width={sequenceColWidth} />
			<col class="avg-pct-col" style:width={avgPctColWidth} />
			<col class="bar-col" style:width={barColWidth} />
		</colgroup>
		<thead>
			<tr>
				<th class="rank-col" scope="col"></th>
				<th class="sequence-col" scope="col">Sequence</th>
				<th class="avg-pct-col" scope="col">Avg % of song</th>
				<th class="bar-col" scope="col">{SEQUENCE_CHART_SONG_APPEARANCES_COL_HEADER}</th>
			</tr>
		</thead>
		<tbody>
			{#each chartData as row, rankIndex (row.label)}
				{@const chords = parseLabelChords(row.label)}
				<tr
					onmouseenter={(event) => showTooltip(event, row)}
					onmousemove={(event) => showTooltip(event, row)}
					onmouseleave={hideTooltip}
				>
					<td class="rank-col">{rankIndex + ONE_BASED_RANK_OFFSET}</td>
					<td class="sequence-col">
						<span class="chord-sequence">
							{#each chords as chord, chordIndex (chordIndex)}
								{@const highlighted =
									hasSearchChords &&
									isRomanTokenPositionHighlighted(
										chordIndex,
										chords,
										searchAbstract,
										{
											fuzzySearch,
											matchAtBeginningOnly,
											matchAtLeastTwice
										}
									)}
								<span class="chord-token" class:highlighted>{chord}</span>
								{#if chordIndex < chords.length - 1}
									<span class="chord-separator"
										>{SEQUENCE_CHART_CHORD_SEPARATOR}</span
									>
								{/if}
							{/each}
						</span>
					</td>
					<td class="avg-pct-col">
						<div class="bar-cell">
							<span class="occurrence-count">{formatAvgPctOfSong(row)}</span>
							<div
								class="bar-track"
								role="img"
								aria-label="Average {formatAvgPctOfSong(row)} of song length"
							>
								<div
									class="bar-fill"
									style:width="{barWidthFromPercent(row.avgPctOfSong)}%"
									style:background-color={SEQUENCE_CHART_AVG_PCT_BAR_COLOR}
								></div>
							</div>
						</div>
					</td>
					<td class="bar-col">
						<div class="bar-cell">
							<span class="occurrence-count">
								{formatPctOfAllSongs(row.songCount)}%
								<span class="song-appearance-count"
									>({formatSequenceChartOccurrences(row.songCount)})</span
								>
							</span>
							<div
								class="bar-track"
								role="img"
								aria-label="{songAppearancesAriaLabel(row)} (length {row.length})"
							>
								<div
									class="bar-fill"
									style:width="{barWidthFromPercent(pctOfAllSongs(row.songCount))}%"
									style:background-color={barColor(row.label, row.length)}
								></div>
							</div>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if isLoading}
		<div class="loading-overlay">{SEQUENCE_CHART_LOADING_MESSAGE}</div>
	{/if}

	{#if tooltip}
		<div
			class="tooltip"
			style:left="{tooltip.x + TOOLTIP_X_OFFSET_PX}px"
			style:top="{tooltip.y + TOOLTIP_Y_OFFSET_PX}px"
		>
			{formatSequenceChartPercent(tooltip.pctOfAllSongs)}% ({formatSequenceChartOccurrences(
				tooltip.songCount
			)}) of {totalUnfilteredSongCount.toLocaleString()} songs · avg {Math.round(
				tooltip.avgPctOfSong
			)}% of song (length {tooltip.length})
		</div>
	{/if}
</div>

<style>
	.chart-wrap {
		position: relative;
		width: 100%;
		overflow: auto;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
	}

	.chart-wrap.is-loading .sequence-table {
		opacity: 0.45;
	}

	.sequence-table {
		width: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		transition: opacity 0.2s ease-out;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.sequence-table th,
	.sequence-table td {
		padding: 0.375rem 0.5rem;
		vertical-align: middle;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.sequence-table th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: rgba(24, 24, 27, 0.95);
		font-size: 0.625rem;
		font-weight: 500;
		color: #71717a;
		text-align: left;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sequence-table tbody tr:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.rank-col {
		color: #71717a;
		font-size: 0.6875rem;
		text-align: left;
	}

	.sequence-col {
		max-width: 0;
		overflow-x: auto;
		white-space: nowrap;
	}

	.avg-pct-col {
		overflow: hidden;
	}

	.bar-col {
		overflow: hidden;
	}

	.chord-sequence {
		display: inline-flex;
		align-items: center;
		gap: 0;
	}

	.chord-token {
		color: #cccccc;
		font-size: 0.6875rem;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
	}

	.chord-token.highlighted {
		color: #fff;
		font-weight: 500;
		background: #4338ca;
	}

	.chord-separator {
		color: #666666;
		font-size: 0.625rem;
		margin: 0 0.125rem;
	}

	.bar-cell {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		min-height: var(--bar-height);
		justify-content: center;
	}

	.occurrence-count {
		font-size: 0.6875rem;
		color: #e4e4e7;
		line-height: 1;
		text-align: left;
	}

	.song-appearance-count {
		color: #71717a;
		font-weight: 400;
	}

	.bar-track {
		width: 100%;
		height: calc(var(--bar-height) * var(--bar-track-height-ratio));
		background: rgba(255, 255, 255, 0.04);
		border-radius: 0.1875rem;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 0.1875rem;
		min-width: var(--bar-min-width);
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		color: #a1a1aa;
		pointer-events: none;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(24, 24, 27, 0.95);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.6875rem;
		color: #e4e4e7;
		white-space: nowrap;
		z-index: 2;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}
</style>

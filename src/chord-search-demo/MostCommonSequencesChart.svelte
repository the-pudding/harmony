<script lang="ts">
	import { buildSearchAbstract } from "./buildSearchAbstract.js";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import { isRomanTokenPositionHighlighted } from "./searchMatchesInRomanTokens.js";
	import type { VariableGramStat } from "./computeVariableGramStats.js";
	import {
		FOUR_CHORDS_PROGRESSION_LABEL,
		SEQUENCE_CHART_BAR_HEIGHT_PX,
		SEQUENCE_CHART_BAR_MIN_WIDTH_PX,
		SEQUENCE_CHART_BAR_TRACK_HEIGHT_RATIO,
		SEQUENCE_CHART_CHORD_SEPARATOR,
		SEQUENCE_CHART_EMPTY_MESSAGE,
		SEQUENCE_CHART_FALLBACK_BAR_COLOR,
		SEQUENCE_CHART_HIGHLIGHT_COLOR,
		SEQUENCE_CHART_LENGTH_COLORS,
		SEQUENCE_CHART_LOADING_MESSAGE,
		SEQUENCE_CHART_OCC_PER_SONG_COL_MIN_WIDTH_PX,
		SEQUENCE_CHART_PLOT_WIDTH_PX,
		SEQUENCE_CHART_RANK_COL_MIN_WIDTH_PX,
		SEQUENCE_CHART_TABLE_MARGIN_PX,
		SEQUENCE_CHART_VIEWPORT_HEIGHT_PX
	} from "./constants.js";

	const chartData = $derived(chordSearchDemoStore.sequenceChartData);
	const chartStatus = $derived(chordSearchDemoStore.sequenceChartStatus);
	const chartError = $derived(chordSearchDemoStore.sequenceChartError);
	const searchChords = $derived(chordSearchDemoStore.searchChords);
	const fuzzySearch = $derived(chordSearchDemoStore.fuzzySearch);
	const ignoreSlashBassNotes = $derived(chordSearchDemoStore.ignoreSlashBassNotes);
	const matchAtBeginningOnly = $derived(chordSearchDemoStore.matchAtBeginningOnly);
	const matchAtLeastTwice = $derived(chordSearchDemoStore.matchAtLeastTwice);
	const searchAbstract = $derived(
		buildSearchAbstract(searchChords, { ignoreSlashBassNotes, fuzzySearch })
	);
	const hasSearchChords = $derived(searchChords.length > 0);
	const minNumChordsToCountAsAProgression = $derived(
		chordSearchDemoStore.minNumChordsToCountAsAProgression
	);
	const chartTitle = $derived(
		`Most common chord sequences (min length ${minNumChordsToCountAsAProgression})`
	);
	const isLoading = $derived(chartStatus === "loading");
	const hasData = $derived(chartData.length > 0);
	const showEmpty = $derived(chartStatus === "ready" && !hasData);
	const showChart = $derived(hasData);

	const maxOccurrences = $derived(
		Math.max(...chartData.map((row) => row.occurrences), 1)
	);

	const parseLabelChords = (label: string) => label.split(SEQUENCE_CHART_CHORD_SEPARATOR);

	const barWidthPercent = (occurrences: number) =>
		(occurrences / maxOccurrences) * 100;

	const occurrencesPerSong = (row: VariableGramStat) =>
		row.songCount > 0 ? row.occurrences / row.songCount : 0;

	const formatOccurrencesPerSong = (row: VariableGramStat) =>
		occurrencesPerSong(row).toLocaleString(undefined, {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		});

	const barColor = (label: string, length: number) =>
		label === FOUR_CHORDS_PROGRESSION_LABEL
			? SEQUENCE_CHART_HIGHLIGHT_COLOR
			: (SEQUENCE_CHART_LENGTH_COLORS[length] ?? SEQUENCE_CHART_FALLBACK_BAR_COLOR);

	let tooltip = $state<{
		label: string;
		occurrences: number;
		songCount: number;
		length: number;
		x: number;
		y: number;
	} | null>(null);

	const showTooltip = (
		event: MouseEvent,
		row: VariableGramStat
	) => {
		tooltip = {
			label: row.label,
			occurrences: row.occurrences,
			songCount: row.songCount,
			length: row.length,
			x: event.offsetX,
			y: event.offsetY
		};
	};

	const hideTooltip = () => {
		tooltip = null;
	};
</script>

<section class="chart-section">
	<h2 class="chart-title">{chartTitle}</h2>

	{#if chartError}
		<p class="error">{chartError}</p>
	{/if}

	{#if isLoading && !showChart}
		<p class="status">{SEQUENCE_CHART_LOADING_MESSAGE}</p>
	{:else if showEmpty}
		<p class="empty">{SEQUENCE_CHART_EMPTY_MESSAGE}</p>
	{:else if showChart}
		<div
			class="chart-wrap"
			class:is-loading={isLoading}
			style:height="{SEQUENCE_CHART_VIEWPORT_HEIGHT_PX}px"
			style:margin="{SEQUENCE_CHART_TABLE_MARGIN_PX}px"
			style:--rank-col-min-width="{SEQUENCE_CHART_RANK_COL_MIN_WIDTH_PX}px"
			style:--occ-per-song-col-min-width="{SEQUENCE_CHART_OCC_PER_SONG_COL_MIN_WIDTH_PX}px"
			style:--bar-height="{SEQUENCE_CHART_BAR_HEIGHT_PX}px"
			style:--bar-track-height-ratio="{SEQUENCE_CHART_BAR_TRACK_HEIGHT_RATIO}"
			style:--bar-min-width="{SEQUENCE_CHART_BAR_MIN_WIDTH_PX}px"
			style:--bar-col-width="{SEQUENCE_CHART_PLOT_WIDTH_PX}px"
		>
			<table class="sequence-table" aria-busy={isLoading}>
				<thead>
					<tr>
						<th class="rank-col" scope="col">Rank</th>
						<th class="sequence-col" scope="col">Sequence</th>
						<th class="occ-per-song-col" scope="col">Occurrences/Song</th>
						<th class="bar-col" scope="col">Occurrences</th>
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
							<td class="rank-col">{rankIndex + 1}</td>
							<td class="sequence-col">
								<span class="chord-sequence">
									{#each chords as chord, chordIndex (chordIndex)}
										{@const highlighted =
											hasSearchChords &&
											isRomanTokenPositionHighlighted(
												chordIndex,
												chords,
												searchAbstract,
												{ fuzzySearch, matchAtBeginningOnly, matchAtLeastTwice }
											)}
										<span class="chord-token" class:highlighted>{chord}</span>
										{#if chordIndex < chords.length - 1}
											<span class="chord-separator">{SEQUENCE_CHART_CHORD_SEPARATOR}</span>
										{/if}
									{/each}
								</span>
							</td>
							<td class="occ-per-song-col">{formatOccurrencesPerSong(row)}</td>
							<td class="bar-col">
								<div class="bar-cell">
									<span class="occurrence-count">{row.occurrences.toLocaleString()}</span>
									<div
										class="bar-track"
										style:width="{SEQUENCE_CHART_PLOT_WIDTH_PX}px"
										role="img"
										aria-label="{row.occurrences.toLocaleString()} occurrences in {row.songCount.toLocaleString()} songs (length {row.length})"
									>
										<div
											class="bar-fill"
											style:width="{barWidthPercent(row.occurrences)}%"
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
					style:left="{tooltip.x + 12}px"
					style:top="{tooltip.y - 8}px"
				>
					{tooltip.occurrences.toLocaleString()} occurrences in {tooltip.songCount.toLocaleString()} songs (length {tooltip.length})
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.chart-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.chart-title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.status,
	.empty {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.error {
		font-size: 0.875rem;
		color: #fca5a5;
		margin: 0;
	}

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
		min-width: var(--rank-col-min-width);
		width: var(--rank-col-min-width);
		color: #71717a;
		font-size: 0.6875rem;
		text-align: left;
	}

	.sequence-col {
		white-space: nowrap;
	}

	.occ-per-song-col {
		min-width: var(--occ-per-song-col-min-width);
		width: var(--occ-per-song-col-min-width);
		color: #a1a1aa;
		font-size: 0.6875rem;
		text-align: right;
		white-space: nowrap;
	}

	.sequence-table th.occ-per-song-col {
		text-align: right;
	}

	.bar-col {
		width: var(--bar-col-width);
		max-width: var(--bar-col-width);
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

	.bar-track {
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

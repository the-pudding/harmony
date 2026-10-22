<script lang="ts">
	// A pared-down song tooltip for the hex map: title, year and artist, one
	// bar splitting the song by matched progression (in each progression's
	// map color, labeled where it belongs to a cluster), and the full
	// sections and chords only when expanded.
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import { toCalendarYear } from "../../../../data/songYear.js";
	import { matchSongV2 } from "../../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "../../match-algo-v2/match-algo-v2-logic/weights.js";
	import {
		computeSongHomogeneity,
		formatEffectiveProgressionCount
	} from "../../shared/progressionHomogeneity.js";
	import SongChordsDisplay from "../../define-chord-progression/components/SongChordsDisplay.svelte";

	type Props = {
		song: GroupedSong;
		// A progression's color on the map, or undefined when no colored
		// region is built on it.
		colorForProgression: (name: string) => string | undefined;
		expanded: boolean;
	};

	const { song, colorForProgression, expanded }: Props = $props();

	const UNCLUSTERED_PROGRESSION_COLOR = "#71717a";
	// Bar labels: a monospace character's width at the labels' font size,
	// the space kept between labels, and how many rows they can stack into
	// before a label that still doesn't fit is left off.
	const LABEL_CHAR_WIDTH_PX = 5.8;
	const LABEL_GAP_PX = 8;
	const LABEL_ROW_COUNT = 2;

	const result = $derived(
		matchSongV2(song, coreProgressionsData, DEFAULT_WEIGHTS)
	);

	const homogeneity = $derived(computeSongHomogeneity(result.matches));

	// Each progression's slice of the whole song: its share of the matched
	// chords, scaled by how much of the song matched at all.
	const segments = $derived(
		(homogeneity?.progressionShares ?? []).map(({ name, share }) => ({
			name,
			percent: share * result.explainedPercent,
			clusterColor: colorForProgression(name)
		}))
	);

	let barWidth = $state(0);

	// Percent and name for the slivers that belong to a map cluster, each centered under
	// its sliver where it fits, biggest slivers first. A label that would
	// overlap one already placed drops to the next row, or is skipped.
	const labels = $derived.by(() => {
		const rows: { left: number; right: number }[][] = Array.from(
			{ length: LABEL_ROW_COUNT },
			() => []
		);
		const placed: {
			name: string;
			text: string;
			color: string;
			left: number;
			row: number;
		}[] = [];
		let start = 0;
		for (const segment of segments) {
			const center = ((start + segment.percent / 2) / 100) * barWidth;
			start += segment.percent;
			if (segment.clusterColor === undefined || barWidth === 0) continue;
			const text = `${Math.round(segment.percent)}% ${segment.name}`;
			const width = text.length * LABEL_CHAR_WIDTH_PX;
			const left = Math.min(
				Math.max(center - width / 2, 0),
				Math.max(barWidth - width, 0)
			);
			const right = left + width;
			const row = rows.findIndex((intervals) =>
				intervals.every(
					(other) =>
						right + LABEL_GAP_PX <= other.left ||
						left >= other.right + LABEL_GAP_PX
				)
			);
			if (row === -1) continue;
			rows[row].push({ left, right });
			placed.push({
				name: segment.name,
				text,
				color: segment.clusterColor,
				left,
				row
			});
		}
		return placed;
	});

	const labelRowCount = $derived(
		labels.reduce((count, { row }) => Math.max(count, row + 1), 0)
	);

	const calendarYear = $derived(
		song.year === undefined ? undefined : toCalendarYear(song.year)
	);

</script>

<div class="hex-song-tooltip">
	<div class="title-row">
		<span class="title">{song.title}</span>
		{#if calendarYear !== undefined}
			<span class="muted">({calendarYear})</span>
		{/if}
		<span class="muted">— {song.artists.join(", ")}</span>
	</div>

	<div class="bar-wrap" bind:clientWidth={barWidth}>
		<div class="bar">
			{#each segments as segment (segment.name)}
				<div
					class="segment"
					style:width="{segment.percent}%"
					style:background={segment.clusterColor ?? UNCLUSTERED_PROGRESSION_COLOR}
				></div>
			{/each}
		</div>
		{#if labelRowCount > 0}
			<div class="labels" style:--row-count={labelRowCount}>
				{#each labels as label (label.name)}
					<span
						class="label"
						style:left="{label.left}px"
						style:--row={label.row}
						style:color={label.color}>{label.text}</span
					>
				{/each}
			</div>
		{/if}
	</div>

	<div class="summary">
		<strong>{result.explainedPercent}%</strong> of song matched
		{#if homogeneity}
			with <strong
				>{formatEffectiveProgressionCount(homogeneity.effectiveProgressionCount)}</strong
			> effective progressions
		{/if}
	</div>

	<div class="hint">
		{#if expanded}
			to collapse hit <kbd>C</kbd>
		{:else}
			for full chords, press <kbd>C</kbd>
		{/if}
	</div>

	{#if expanded}
		<div class="chords">
			<SongChordsDisplay {song} annotations={result.annotations} compact />
		</div>
	{/if}
</div>

<style>
	.hex-song-tooltip {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem;
	}

	.title {
		font-weight: 600;
		color: #f4f4f5;
	}

	.muted {
		color: #71717a;
	}

	.bar-wrap {
		position: relative;
	}

	.bar {
		display: flex;
		gap: 1px;
		height: 0.625rem;
		border-radius: 0.1875rem;
		overflow: hidden;
		background: #27272a;
	}

	.segment {
		flex-shrink: 0;
	}

	/* LABEL_CHAR_WIDTH_PX assumes .label's font size. */
	.labels {
		--label-line: 0.85rem;
		position: relative;
		height: calc(var(--row-count) * var(--label-line));
		margin-top: 0.25rem;
	}

	.label {
		position: absolute;
		top: calc(var(--row) * var(--label-line));
		font-size: 0.6rem;
		line-height: var(--label-line);
		white-space: nowrap;
	}

	.summary {
		color: #71717a;
		font-size: 0.7rem;
	}

	.summary strong {
		color: #fff;
	}

	.hint {
		color: #71717a;
		font-size: 0.65rem;
	}

	kbd {
		padding: 0 0.25rem;
		border: 1px solid #3f3f46;
		border-radius: 0.1875rem;
		color: #d4d4d8;
		font-family: inherit;
	}

	.chords {
		padding-top: 0.375rem;
		border-top: 1px solid #27272a;
	}
</style>

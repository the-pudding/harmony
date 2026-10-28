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
	import ProgressionShareBar from "./ProgressionShareBar.svelte";

	type Props = {
		song: GroupedSong;
		// A progression's color on the map, or undefined when no colored
		// region is built on it.
		colorForProgression: (name: string) => string | undefined;
		expanded: boolean;
	};

	const { song, colorForProgression, expanded }: Props = $props();

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
			color: colorForProgression(name)
		}))
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

	<ProgressionShareBar {segments} />

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

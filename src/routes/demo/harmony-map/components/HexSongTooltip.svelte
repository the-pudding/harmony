<script lang="ts">
	// A pared-down song tooltip for the hex map: title, year and artist, one
	// bar splitting the song by matched progression (in each progression's
	// map color, labeled where it belongs to a cluster), and a hint at what
	// clicking does.
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import { toCalendarYear } from "../../../../data/songYear.js";
	import { matchSongV2 } from "../../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "../../match-algo-v2/match-algo-v2-logic/weights.js";
	import {
		computeSongHomogeneity,
		formatEffectiveProgressionCount
	} from "../../shared/progressionHomogeneity.js";
	import ProgressionShareBar from "./ProgressionShareBar.svelte";

	type Props = {
		song: GroupedSong;
		// A progression's color on the map, or undefined when no colored
		// region is built on it.
		colorForProgression: (name: string) => string | undefined;
		// What clicking the song does; nothing is shown when empty.
		hint: string;
	};

	const { song, colorForProgression, hint }: Props = $props();

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
				>{formatEffectiveProgressionCount(
					homogeneity.effectiveProgressionCount
				)}</strong
			> effective progressions
		{/if}
	</div>

	{#if hint}
		<div class="hint">{hint}</div>
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
</style>

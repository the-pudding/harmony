<script lang="ts">
	import { MOST_DIVERSE_BAND, MOST_HOMOGENEOUS_BAND } from "../shared/progressionHomogeneity.js";
	import DataTable from "./DataTable.svelte";
	import type { DecadeHomogeneityRow, SongHomogeneityRow } from "./homogeneityAnalysis.js";
	import { formatEffectiveCount, formatPercent } from "./homogeneityFormat.js";
	import SongLink from "./SongLink.svelte";

	type Props = {
		rows: DecadeHomogeneityRow[];
	};

	const { rows }: Props = $props();

	const HEADERS = [
		"Decade",
		"Songs",
		"Median effective",
		MOST_HOMOGENEOUS_BAND.label,
		MOST_DIVERSE_BAND.label,
		"Most homogeneous hit",
		"Most diverse hit"
	];
	const MIN_TABLE_WIDTH = "56rem";
</script>

{#snippet exampleSong(song: SongHomogeneityRow | null)}
	{#if song}
		<SongLink songKey={song.songKey} title={song.title} artists={song.artists} />
		<span class="numeric muted">({formatEffectiveCount(song.effectiveProgressionCount)})</span>
	{:else}
		<span class="muted">—</span>
	{/if}
{/snippet}

<DataTable headers={HEADERS} minWidth={MIN_TABLE_WIDTH}>
	{#each rows as row (row.decade)}
		<tr>
			<td class="strong">{row.decade}s</td>
			<td class="numeric muted">{row.songCount.toLocaleString()}</td>
			<td class="numeric strong">{formatEffectiveCount(row.medianEffectiveCount)}</td>
			<td class="numeric">{formatPercent(row.bandSharePercents[MOST_HOMOGENEOUS_BAND.id])}</td>
			<td class="numeric">{formatPercent(row.bandSharePercents[MOST_DIVERSE_BAND.id])}</td>
			<td>{@render exampleSong(row.mostHomogeneousExample)}</td>
			<td>{@render exampleSong(row.mostDiverseExample)}</td>
		</tr>
	{/each}
</DataTable>

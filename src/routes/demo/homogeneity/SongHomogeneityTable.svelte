<script lang="ts">
	import { toCalendarYear } from "../../../data/songYear.js";
	import DataTable from "./DataTable.svelte";
	import type { SongHomogeneityRow } from "./homogeneityAnalysis.js";
	import { formatEffectiveCount, formatPercent, formatShareAsPercent } from "./homogeneityFormat.js";
	import ProgressionShareBar from "./ProgressionShareBar.svelte";
	import SongLink from "./SongLink.svelte";

	type Props = {
		rows: SongHomogeneityRow[];
	};

	const { rows }: Props = $props();

	const HEADERS = ["Song", "Year", "Effective", "Distinct", "Top progression", "Recipe", "Matched"];
	const MIN_TABLE_WIDTH = "48rem";
</script>

<DataTable headers={HEADERS} minWidth={MIN_TABLE_WIDTH}>
	{#each rows as row (row.songKey)}
		<tr>
			<td>
				<SongLink songKey={row.songKey} title={row.title} artists={row.artists} emphasized />
			</td>
			<td class="numeric muted">{row.year === undefined ? "—" : toCalendarYear(row.year)}</td>
			<td class="numeric nowrap">
				<span class="band-dot" style:background={row.band.color}></span>
				<span class="strong">{formatEffectiveCount(row.effectiveProgressionCount)}</span>
			</td>
			<td class="numeric">{row.distinctProgressionCount}</td>
			<td class="nowrap">
				{row.dominantProgressionName}
				<span class="numeric muted">{formatShareAsPercent(row.dominantShare)}</span>
			</td>
			<td><ProgressionShareBar shares={row.progressionShares} /></td>
			<td class="numeric muted">{formatPercent(row.coveragePercent)}</td>
		</tr>
	{/each}
</DataTable>

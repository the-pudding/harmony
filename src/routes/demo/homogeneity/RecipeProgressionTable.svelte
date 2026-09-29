<script lang="ts">
	import DataTable from "./DataTable.svelte";
	import type { RecipeProgressionRow } from "./homogeneityAnalysis.js";
	import SongLink from "./SongLink.svelte";

	type Props = {
		rows: RecipeProgressionRow[];
	};

	const { rows }: Props = $props();

	const HEADERS = ["#", "Progression", "Songs", "Share of band", "Examples"];
	const MIN_TABLE_WIDTH = "40rem";
	const SHARE_DECIMAL_PLACES = 1;
</script>

<DataTable headers={HEADERS} minWidth={MIN_TABLE_WIDTH}>
	{#each rows as row, index (row.name)}
		<tr>
			<td class="numeric muted">{index + 1}</td>
			<td class="strong nowrap">{row.name}</td>
			<td class="numeric">{row.songCount.toLocaleString()}</td>
			<td class="numeric">{row.sharePercent.toFixed(SHARE_DECIMAL_PLACES)}%</td>
			<td>
				{#each row.exampleSongs as song, songIndex (song.songKey)}
					{#if songIndex > 0}<span class="muted"> · </span>{/if}
					<SongLink songKey={song.songKey} title={song.title} artists={song.artists} />
				{/each}
			</td>
		</tr>
	{/each}
</DataTable>

<script lang="ts">
	import type { PotentialCoreProgressionRow } from "./buildPotentialCoreProgressions.js";
	import CoveragePercentHistogram from "./CoveragePercentHistogram.svelte";
	import { buildDefineChordProgressionSongUrl } from "../shared/defineChordProgressionSongUrl.js";

	type Props = {
		rows: PotentialCoreProgressionRow[];
		totalSongs: number;
	};

	const { rows, totalSongs }: Props = $props();

	const formatPercent = (n: number): string =>
		n < 1 ? `<1%` : `${n.toFixed(1)}%`;
</script>

<div class="table-wrap">
	{#if rows.length === 0}
		<p class="empty">No results yet — waiting for corpus analysis to complete.</p>
	{:else}
		<p class="subtitle">
			Gap-discovered progressions appearing in ≥0.5% of the {totalSongs.toLocaleString()} songs analyzed,
			ordered by prevalence.
		</p>
		<table class="table">
			<thead>
				<tr>
					<th class="col-progression">Progression</th>
					<th class="col-songs">Songs matched</th>
					<th class="col-histogram">% of song explained</th>
					<th class="col-topsongs">Top songs</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.chordProgression)}
					<tr>
						<td class="col-progression">
							<span class="progression-label">{row.chordProgression}</span>
						</td>
						<td class="col-songs">
							<span class="song-count">{row.songCount.toLocaleString()}</span>
							<span class="song-pct">({formatPercent(row.songPercent)})</span>
						</td>
						<td class="col-histogram">
							<CoveragePercentHistogram values={row.coveragePercents} />
						</td>
						<td class="col-topsongs">
							<ul class="song-list">
								{#each row.topSongs as song (song.songKey)}
									<li>
										<a
											href={buildDefineChordProgressionSongUrl(song.songKey)}
											target="_blank"
											rel="noopener"
											class="song-link"
											title="{song.title} — {song.coveragePercent.toFixed(0)}% covered"
										>
											{song.title}
										</a>
									</li>
								{/each}
							</ul>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.table-wrap {
		width: 100%;
		overflow-x: auto;
	}

	.subtitle {
		font-size: 0.8125rem;
		color: #71717a;
		margin: 0 0 1rem;
		line-height: 1.5;
	}

	.empty {
		font-size: 0.8125rem;
		color: #71717a;
		font-style: italic;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
		table-layout: fixed;
	}

	thead th {
		text-align: left;
		color: #71717a;
		font-weight: 500;
		padding: 0.25rem 0.75rem 0.5rem 0;
		border-bottom: 1px solid rgba(63, 63, 70, 0.7);
		white-space: nowrap;
	}

	tbody tr {
		border-bottom: 1px solid rgba(39, 39, 42, 0.6);
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	tbody td {
		padding: 0.5rem 0.75rem 0.5rem 0;
		vertical-align: middle;
		color: #d4d4d8;
	}

	.col-progression {
		width: 14rem;
	}

	.col-songs {
		width: 9rem;
	}

	.col-histogram {
		width: 10rem;
	}

	.col-topsongs {
		width: auto;
	}

	.progression-label {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		color: #f4f4f5;
		font-weight: 500;
	}

	.song-count {
		color: #f4f4f5;
		font-weight: 500;
	}

	.song-pct {
		color: #71717a;
		margin-left: 0.25rem;
	}

	.song-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.song-link {
		color: #a5b4fc;
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 20rem;
		display: block;
	}

	.song-link:hover {
		color: #c7d2fe;
		text-decoration: underline;
	}
</style>

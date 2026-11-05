<script lang="ts">
	import { committedSyncedSongs, syncedSongClusters } from "$data/syncedSongs.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import LabeledSelect from "./LabeledSelect.svelte";
	import {
		MAX_GROUP_SIZE,
		MIN_GROUP_SIZE,
		MIN_SHARE_PERCENT,
		type ClusterKeyIdea
	} from "./clusterIdeas.js";
	import { RECORD_TAB_AUDIO } from "./recordTabs.js";
	import { readRecordCluster, replaceClusterInUrl } from "./recordUrlState.js";

	type Props = {
		ideas: Record<string, ClusterKeyIdea[]>;
		// Songs with audio in static/, ready to record.
		audioSongKeys: string[];
	};

	let { ideas, audioSongKeys }: Props = $props();

	const DEFAULT_CLUSTER = "doo wop";

	const clusterOptions = $derived(
		syncedSongClusters.map((name) => ({
			value: name,
			label: `${name}${ideas[name]?.length ? "" : " · no groups"}`
		}))
	);

	const initialCluster = readRecordCluster(currentSearchParams());
	let cluster = $state(
		initialCluster && syncedSongClusters.includes(initialCluster)
			? initialCluster
			: syncedSongClusters.includes(DEFAULT_CLUSTER)
				? DEFAULT_CLUSTER
				: syncedSongClusters[0]
	);
	const keyIdeas = $derived(ideas[cluster] ?? []);
	const hasAudio = $derived(new Set(audioSongKeys));

	function pickCluster(name: string) {
		cluster = name;
		replaceClusterInUrl(name);
	}

	const recordHref = (songKey: string): string =>
		`?tab=${RECORD_TAB_AUDIO}&song=${encodeURIComponent(songKey)}`;
</script>

<div class="ideas">
	<p class="intro">
		Groups of {MIN_GROUP_SIZE}–{MAX_GROUP_SIZE} songs in the same key where the
		cluster's progression covers at least {MIN_SHARE_PERCENT}% of the chords.
		Each group takes the strongest song from as many decades as it can
		(strength is coverage weighted by popularity). Keys are ranked by decades
		covered, then strength. Songs whose sections disagree on the key are left
		out.
	</p>

	<LabeledSelect
		label="Cluster"
		options={clusterOptions}
		value={cluster}
		onSelect={pickCluster}
	/>

	{#if keyIdeas.length === 0}
		<p class="message">
			No key has {MIN_GROUP_SIZE} songs for this cluster.
		</p>
	{:else}
		<ol class="key-ideas">
			{#each keyIdeas as idea, rank (idea.keyLabel)}
				<li class="key-idea">
					<div class="key-header">
						<span class="rank">#{rank + 1}</span>
						<span class="key">{idea.keyLabel}</span>
						<span class="meta"
							>{idea.decadeCount} decades · {idea.candidateCount} songs in this
							key</span
						>
					</div>
					<table>
						<tbody>
							{#each idea.songs as song (song.songKey)}
								<tr>
									<td class="year">{song.year}</td>
									<td class="title">
										{song.title}
										<span class="artists">— {song.artists.join(", ")}</span>
									</td>
									<td class="share">{Math.round(song.sharePercent)}%</td>
									<td class="status">
										{#if committedSyncedSongs[song.songKey]}
											<span class="badge synced">✅ synced</span>
										{:else if hasAudio.has(song.songKey)}
											<a
												class="badge audio"
												href={recordHref(song.songKey)}
												data-sveltekit-reload>record →</a
											>
										{:else}
											<span class="badge none">no audio</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.ideas {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-size: 0.75rem;
	}

	.intro {
		max-width: 48rem;
		margin: 0;
		line-height: 1.6;
		color: #a1a1aa;
	}

	.message {
		margin: 0;
		color: #a1a1aa;
	}

	.key-ideas {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.key-idea {
		max-width: 48rem;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.key-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.rank {
		color: #71717a;
	}

	.key {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.meta {
		color: #71717a;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	td {
		padding: 0.25rem 0.5rem 0.25rem 0;
		vertical-align: baseline;
	}

	.year,
	.share {
		color: #a1a1aa;
		white-space: nowrap;
	}

	.share {
		text-align: right;
	}

	.title {
		color: #f4f4f5;
	}

	.artists {
		color: #a1a1aa;
	}

	.status {
		text-align: right;
		white-space: nowrap;
	}

	.badge {
		font-size: 0.625rem;
	}

	.badge.synced {
		color: #86efac;
	}

	.badge.audio {
		color: #a5b4fc;
	}

	.badge.none {
		color: #52525b;
	}
</style>

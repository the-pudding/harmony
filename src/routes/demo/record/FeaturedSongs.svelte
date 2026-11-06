<script lang="ts">
	import { base } from "$app/paths";
	import {
		committedSyncedSongs,
		SYNCED_SONG_REFERENCE_FILE,
		syncedSongClusters,
		syncedSongReferenceRows,
		type SyncedSongReferenceRow
	} from "$data/syncedSongs.js";
	import type { FeaturedSongSetting } from "$data/syncedSongReference.js";
	import { humanizeScale } from "$data/songBrowser.js";
	import { audioSrcOf, songKeyLabel } from "./recordSongs.js";

	const SAVE_URL = `${base}/demo/record/api`;

	const rowBySongKey = new Map(
		syncedSongReferenceRows.map((row) => [row.songKey, row])
	);

	const clusterRank = (cluster: string): number => {
		const rank = syncedSongClusters.indexOf(cluster);
		return rank === -1 ? Infinity : rank;
	};

	// Clusters with synced songs, in top-progression rank order.
	const clusters = [
		...new Set(syncedSongReferenceRows.map((row) => row.cluster))
	].sort((a, b) => clusterRank(a) - clusterRank(b));

	const settingsFor = (cluster: string): FeaturedSongSetting[] =>
		syncedSongReferenceRows
			.filter((row) => row.cluster === cluster)
			.map(({ songKey, visible }) => ({ songKey, visible }));

	let lists = $state(
		Object.fromEntries(clusters.map((cluster) => [cluster, settingsFor(cluster)]))
	);
	let savedLists = $state.raw(
		Object.fromEntries(clusters.map((cluster) => [cluster, settingsFor(cluster)]))
	);
	let saving = $state<string | null>(null);
	let errors = $state<Record<string, string>>({});

	const isDirty = (cluster: string): boolean =>
		JSON.stringify(lists[cluster]) !== JSON.stringify(savedLists[cluster]);

	function move(cluster: string, from: number, to: number) {
		const list = lists[cluster];
		if (to < 0 || to >= list.length || from === to) return;
		const [song] = list.splice(from, 1);
		list.splice(to, 0, song);
	}

	async function save(cluster: string) {
		// Hidden songs sink to the bottom, each group keeping its order.
		const current = $state.snapshot(lists[cluster]);
		const songs = [
			...current.filter((song) => song.visible),
			...current.filter((song) => !song.visible)
		];
		saving = cluster;
		errors[cluster] = "";
		try {
			const response = await fetch(SAVE_URL, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ cluster, songs })
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(
					response.status === 404
						? "saving only works under npm run dev"
						: (body.error ?? `HTTP ${response.status}`)
				);
			}
			savedLists = { ...savedLists, [cluster]: songs };
			lists[cluster] = songs.map((song) => ({ ...song }));
		} catch (error) {
			errors[cluster] = error instanceof Error ? error.message : String(error);
		} finally {
			saving = null;
		}
	}

	function revert(cluster: string) {
		lists[cluster] = savedLists[cluster].map((song) => ({ ...song }));
	}

	// Dragging: the song being dragged moves live as it passes over others.
	let dragging = $state<{ cluster: string; index: number } | null>(null);

	function dragOver(event: DragEvent, cluster: string, index: number) {
		if (dragging?.cluster !== cluster) return;
		event.preventDefault();
		if (dragging.index === index) return;
		move(cluster, dragging.index, index);
		dragging = { cluster, index };
	}

	// Previewing a song's region.
	let previewEl = $state<HTMLAudioElement>();
	let previewing = $state<SyncedSongReferenceRow | null>(null);

	function togglePreview(row: SyncedSongReferenceRow) {
		const file = committedSyncedSongs[row.songKey];
		if (!previewEl || !file) return;
		if (previewing?.songKey === row.songKey) {
			previewEl.pause();
			previewing = null;
			return;
		}
		previewing = row;
		previewEl.src = audioSrcOf(file.audioFile);
		previewEl.currentTime = row.startSeconds;
		void previewEl.play();
	}

	function stopAtRegionEnd() {
		if (previewEl && previewing && previewEl.currentTime >= previewing.endSeconds) {
			previewEl.pause();
			previewing = null;
		}
	}

	// The key the song was recorded in, e.g. "A major".
	const keyLabelOf = (songKey: string): string | null => {
		const key = committedSyncedSongs[songKey]?.key;
		return key ? `${key.tonic} ${humanizeScale(key.scale)}` : null;
	};

	const formatSeconds = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const rest = Math.floor(seconds % 60);
		return `${minutes}:${String(rest).padStart(2, "0")}`;
	};
</script>

<div class="featured">
	<p class="intro">
		Synced songs by cluster, from <code>{SYNCED_SONG_REFERENCE_FILE}</code>.
		Check the ones to show on the map, and drag to set the order
		they play in. Save writes the cluster's rows back to the file; it only works
		under <code>npm run dev</code>.
	</p>

	{#if clusters.length === 0}
		<p class="message">No synced songs yet. Record one in the Record audio tab.</p>
	{/if}

	{#each clusters as cluster (cluster)}
		{@const list = lists[cluster]}
		{@const dirty = isDirty(cluster)}
		<section class="cluster">
			<div class="cluster-header">
				<h3>{cluster}</h3>
				<span class="count"
					>{list.filter((song) => song.visible).length} of {list.length} visible</span
				>
				<div class="actions">
					<button type="button" disabled={!dirty} onclick={() => revert(cluster)}
						>Revert</button
					>
					<button
						type="button"
						class="save"
						disabled={!dirty || saving !== null}
						onclick={() => save(cluster)}
						>{saving === cluster ? "Saving…" : dirty ? "Save" : "Saved"}</button
					>
				</div>
			</div>
			{#if errors[cluster]}
				<p class="message error">Couldn't save: {errors[cluster]}</p>
			{/if}
			<ol class="songs">
				{#each list as song, index (song.songKey)}
					{@const row = rowBySongKey.get(song.songKey)}
					<li
						class:hidden={!song.visible}
						class:dragging={dragging?.cluster === cluster &&
							dragging.index === index}
						draggable="true"
						ondragstart={(event) => {
							dragging = { cluster, index };
							event.dataTransfer?.setData("text/plain", song.songKey);
						}}
						ondragover={(event) => dragOver(event, cluster, index)}
						ondragend={() => (dragging = null)}
					>
						<span class="handle" aria-hidden="true">⠿</span>
						<span class="order">{index + 1}</span>
						<input
							type="checkbox"
							aria-label="Show {songKeyLabel(song.songKey)} on the map"
							bind:checked={song.visible}
						/>
						<button
							type="button"
							class="preview"
							disabled={!row || !committedSyncedSongs[song.songKey]}
							aria-label="Preview {songKeyLabel(song.songKey)}"
							onclick={() => row && togglePreview(row)}
							>{previewing?.songKey === song.songKey ? "■" : "▶"}</button
						>
						<span class="name">{songKeyLabel(song.songKey)}</span>
						{#if keyLabelOf(song.songKey)}
							<span class="key">{keyLabelOf(song.songKey)}</span>
						{/if}
						{#if row}
							<span class="region"
								>{formatSeconds(row.startSeconds)}–{formatSeconds(
									row.endSeconds
								)}</span
							>
						{/if}
					</li>
				{/each}
			</ol>
		</section>
	{/each}

	<audio
		bind:this={previewEl}
		ontimeupdate={stopAtRegionEnd}
		onended={() => (previewing = null)}
		preload="none"
	></audio>
</div>

<style>
	.featured {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		font-size: 0.75rem;
	}

	.intro {
		max-width: 48rem;
		margin: 0;
		line-height: 1.6;
		color: #a1a1aa;
	}

	code {
		color: #d4d4d8;
	}

	.message {
		margin: 0;
		color: #a1a1aa;
	}

	.message.error {
		color: #fca5a5;
	}

	.cluster {
		max-width: 48rem;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.cluster-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
	}

	h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.count {
		color: #71717a;
	}

	.actions {
		margin-left: auto;
		display: flex;
		gap: 0.5rem;
	}

	button {
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: rgba(24, 24, 27, 0.6);
		color: #f4f4f5;
		font: inherit;
		cursor: pointer;
	}

	button.save:not(:disabled) {
		border-color: #6366f1;
		background: #6366f1;
	}

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.songs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: rgba(39, 39, 42, 0.5);
		color: #f4f4f5;
		cursor: grab;
	}

	li.dragging {
		border-color: #6366f1;
		opacity: 0.6;
	}

	li.hidden .name,
	li.hidden .key,
	li.hidden .region {
		color: #52525b;
		text-decoration: line-through;
	}

	.handle {
		color: #52525b;
	}

	.order {
		width: 1.25rem;
		text-align: right;
		color: #71717a;
	}

	/* The global reset strips input appearance; bring the native box back. */
	input[type="checkbox"] {
		-webkit-appearance: auto;
		appearance: auto;
		width: 1rem;
		height: 1rem;
		margin: 0;
		flex-shrink: 0;
		accent-color: #6366f1;
		cursor: pointer;
	}

	.preview {
		width: 1.75rem;
		padding: 0.125rem 0;
	}

	.name {
		flex: 1;
		min-width: 0;
		text-transform: capitalize;
	}

	.key {
		color: #c4b5fd;
		white-space: nowrap;
	}

	.region {
		color: #a1a1aa;
		white-space: nowrap;
	}
</style>

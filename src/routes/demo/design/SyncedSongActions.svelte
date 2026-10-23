<script lang="ts">
	import { base } from "$app/paths";
	import {
		committedSyncedSongClusters,
		syncedSongClusters,
		type SyncedSongFile
	} from "$data/syncedSongs.js";
	import useClipboard from "$runes/useClipboard.svelte.js";
	import { formatJsonLikeRepo } from "./formatJsonLikeRepo.js";

	const SAVE_URL = `${base}/demo/design/api`;

	type Props = {
		file: SyncedSongFile;
		targetFilePath: string;
		canSave: boolean;
		hasLocalEdits: boolean;
		hasRecordedChords: boolean;
		onSaved: (file: SyncedSongFile) => void;
		onDiscardLocalEdits: () => void;
		onClearChords: () => void;
	};

	let {
		file,
		targetFilePath,
		canSave,
		hasLocalEdits,
		hasRecordedChords,
		onSaved,
		onDiscardLocalEdits,
		onClearChords
	}: Props = $props();

	const clipboard = useClipboard("");

	let saving = $state(false);
	let saveError = $state("");

	// Cluster rows in reference.csv, by song key, including ones saved since
	// the page loaded. The picked cluster is per song so switching songs
	// shows that song's saved cluster.
	let savedClusters = $state({ ...committedSyncedSongClusters });
	let pickedCluster = $state<{ songKey: string; cluster: string }>();
	const savedCluster = $derived(savedClusters[file.songKey] ?? "");
	const cluster = $derived(
		pickedCluster?.songKey === file.songKey
			? pickedCluster.cluster
			: savedCluster
	);
	const hasUnsavedCluster = $derived(cluster !== savedCluster);

	async function save() {
		const savedFile = file;
		const savedFileCluster = cluster;
		saving = true;
		saveError = "";
		try {
			const response = await fetch(SAVE_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ file: savedFile, cluster: savedFileCluster })
			});
			if (!response.ok) {
				throw new Error(
					response.status === 404
						? "saving only works under npm run dev"
						: `HTTP ${response.status}`
				);
			}
			savedClusters[savedFile.songKey] = savedFileCluster;
			onSaved(savedFile);
		} catch (error) {
			saveError = error instanceof Error ? error.message : String(error);
		} finally {
			saving = false;
		}
	}

	async function copyJson() {
		await clipboard.copy(await formatJsonLikeRepo(file));
	}
</script>

<div class="actions">
	<select
		aria-label="Cluster"
		value={cluster}
		onchange={(event) =>
			(pickedCluster = {
				songKey: file.songKey,
				cluster: event.currentTarget.value
			})}
	>
		<option value="" disabled>Pick a cluster…</option>
		{#each syncedSongClusters as name (name)}
			<option value={name}>{name}</option>
		{/each}
	</select>
	<button
		type="button"
		class="save"
		disabled={!canSave ||
			!cluster ||
			!(hasLocalEdits || hasUnsavedCluster) ||
			saving}
		title={cluster ? undefined : "Pick a cluster to save"}
		onclick={save}>{saving ? "Saving…" : "Save"}</button
	>
	<button type="button" disabled={!canSave} onclick={copyJson}
		>{clipboard.copied ? "Copied" : "Copy JSON"}</button
	>
	<button type="button" disabled={!hasLocalEdits} onclick={onDiscardLocalEdits}
		>Discard unsaved edits</button
	>
	<button type="button" disabled={!hasRecordedChords} onclick={onClearChords}
		>Clear chords</button
	>
	{#if saveError}
		<span class="error">Couldn't save: {saveError}</span>
	{:else}
		<span class="hint"
			>{hasLocalEdits || hasUnsavedCluster
				? "Unsaved edits · saves to"
				: "Saved in"}
			<code>{targetFilePath}</code></span
		>
	{/if}
</div>

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	button,
	select {
		padding: 0.375rem 0.625rem;
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

	.hint {
		color: #71717a;
	}

	.error {
		color: #fca5a5;
	}

	code {
		color: #a1a1aa;
	}
</style>

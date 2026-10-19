<script lang="ts">
	import { base } from "$app/paths";
	import type { SyncedSongFile } from "$data/syncedSongs.js";
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

	async function save() {
		const savedFile = file;
		saving = true;
		saveError = "";
		try {
			const response = await fetch(SAVE_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(savedFile)
			});
			if (!response.ok) {
				throw new Error(
					response.status === 404
						? "saving only works under npm run dev"
						: `HTTP ${response.status}`
				);
			}
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
	<button
		type="button"
		class="save"
		disabled={!canSave || !hasLocalEdits || saving}
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
			>{hasLocalEdits ? "Unsaved edits · saves to" : "Saved in"}
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

	button {
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

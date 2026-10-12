<script lang="ts">
	import useClipboard from "$runes/useClipboard.svelte.js";

	type Props = {
		json: string | null;
		targetFilePath: string;
		hasLocalEdits: boolean;
		onDiscardLocalEdits: () => void;
	};

	let { json, targetFilePath, hasLocalEdits, onDiscardLocalEdits }: Props =
		$props();

	const clipboard = useClipboard("");

	function copyJson() {
		if (json !== null) clipboard.copy(json);
	}
</script>

<div class="actions">
	<button type="button" disabled={json === null} onclick={copyJson}
		>{clipboard.copied ? "Copied" : "Copy timings JSON"}</button
	>
	<button type="button" disabled={!hasLocalEdits} onclick={onDiscardLocalEdits}
		>Discard local edits</button
	>
	<span class="hint">Paste into <code>{targetFilePath}</code></span>
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

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.hint {
		color: #71717a;
	}

	code {
		color: #a1a1aa;
	}
</style>

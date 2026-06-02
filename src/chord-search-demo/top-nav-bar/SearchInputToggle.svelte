<script lang="ts">
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import {
		PAUSE_SENTINEL_NOTES,
		SEARCH_INPUT_ACTIVE_LABEL,
		SEARCH_INPUT_PAUSED_LABEL
	} from "../constants.js";

	const INPUT_TOGGLE_MIC_ICON = "🎤";
	const INPUT_TOGGLE_MUTE_ICON = "🔇";
</script>

<button
	type="button"
	class="action-pill input-toggle"
	class:active={chordSearchDemoStore.searchInputActive}
	class:paused={!chordSearchDemoStore.searchInputActive}
	aria-pressed={chordSearchDemoStore.searchInputActive}
	onclick={chordSearchDemoStore.toggleSearchInput}
>
	<span class="input-icon" aria-hidden="true">
		{chordSearchDemoStore.searchInputActive
			? INPUT_TOGGLE_MIC_ICON
			: INPUT_TOGGLE_MUTE_ICON}
	</span>
	{chordSearchDemoStore.searchInputActive
		? SEARCH_INPUT_ACTIVE_LABEL
		: SEARCH_INPUT_PAUSED_LABEL}
	<span class="shortcut">· toggle: {PAUSE_SENTINEL_NOTES}</span>
</button>

<style>
	.action-pill {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		white-space: nowrap;
		font-family: inherit;
		line-height: 1;
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
	}

	.input-icon {
		font-size: 0.75rem;
		line-height: 1;
	}

	.action-pill.input-toggle.active {
		color: #4ade80;
		border-color: rgba(74, 222, 128, 0.35);
		background: rgba(74, 222, 128, 0.08);
	}

	.action-pill.input-toggle.active:hover {
		color: #86efac;
		border-color: rgba(134, 239, 172, 0.45);
		background: rgba(74, 222, 128, 0.14);
	}

	.action-pill.input-toggle.paused {
		color: #f87171;
		border-color: rgba(248, 113, 113, 0.35);
		background: rgba(248, 113, 113, 0.08);
	}

	.action-pill.input-toggle.paused:hover {
		color: #fca5a5;
		border-color: rgba(252, 165, 165, 0.45);
		background: rgba(248, 113, 113, 0.14);
	}

	.shortcut {
		opacity: 0.75;
		text-transform: none;
	}
</style>

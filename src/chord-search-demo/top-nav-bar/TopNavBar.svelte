<script lang="ts">
	import SearchProgression from "../SearchProgression.svelte";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import {
		CLEAR_CHORDS_LABEL,
		CLEAR_SENTINEL_NOTES,
		PAUSE_SENTINEL_NOTES,
		SEARCH_INPUT_ACTIVE_LABEL,
		SEARCH_INPUT_PAUSED_LABEL,
		TOP_NAV_CHORD_SEARCH_GROUP_HEIGHT,
		TOP_NAV_CHORD_SEARCH_GROUP_PADDING_Y
	} from "../constants.js";
	import ArtistFilter from "./ArtistFilter.svelte";
	import TitleArtistFilter from "./TitleArtistFilter.svelte";

	const INPUT_TOGGLE_MIC_ICON = "🎤";
	const INPUT_TOGGLE_MUTE_ICON = "🔇";

	type Props = {
		isConnected: boolean;
		selectedInputName: string;
		connectError: string;
		onConnect: () => void | Promise<void>;
	};

	let { isConnected, selectedInputName, connectError, onConnect }: Props = $props();
</script>

<nav class="top-nav" aria-label="Search filters and current progression">
	<ArtistFilter />
	<TitleArtistFilter />
	<div
		class="chord-search-group"
		style="--chord-search-group-height: {TOP_NAV_CHORD_SEARCH_GROUP_HEIGHT}; --chord-search-group-padding-y: {TOP_NAV_CHORD_SEARCH_GROUP_PADDING_Y};"
	>
		<div class="progression-wrap">
			<SearchProgression
				chords={chordSearchDemoStore.searchChords}
				fuzzySearch={chordSearchDemoStore.fuzzySearch}
				ignoreSlashBassNotes={chordSearchDemoStore.ignoreSlashBassNotes}
				searchInputActive={chordSearchDemoStore.searchInputActive}
			/>
		</div>
		<div class="search-actions">
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
			<button type="button" class="action-pill clear" onclick={chordSearchDemoStore.clearSearch}>
				{CLEAR_CHORDS_LABEL}
				<span class="shortcut">· {CLEAR_SENTINEL_NOTES}</span>
			</button>
		</div>
	</div>
	<div class="nav-trailing">
		<div class="midi-status">
			{#if isConnected}
				<span class="connected" title={selectedInputName}>connected</span>
			{:else}
				<button type="button" class="connect" onclick={onConnect}>connect</button>
			{/if}
			{#if connectError}
				<span class="connect-error">{connectError}</span>
			{/if}
		</div>
	</div>
</nav>

<style>
	.top-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(9, 9, 11, 0.92);
		border-bottom: 1px solid rgba(39, 39, 42, 0.8);
		backdrop-filter: blur(8px);
		box-sizing: border-box;
	}

	.chord-search-group {
		flex: 1;
		min-width: 0;
		min-height: var(--chord-search-group-height);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: var(--chord-search-group-padding-y) 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.progression-wrap {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}

	.nav-trailing {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.search-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

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
	}

	.input-icon {
		font-size: 0.75rem;
		line-height: 1;
	}

	.action-pill.input-toggle {
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
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

	.action-pill.clear {
		cursor: pointer;
		color: #fca5a5;
		border-color: rgba(252, 165, 165, 0.35);
		background: rgba(252, 165, 165, 0.08);
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
	}

	.action-pill.clear:hover {
		color: #fecaca;
		border-color: rgba(254, 202, 202, 0.45);
		background: rgba(252, 165, 165, 0.14);
	}

	.shortcut {
		opacity: 0.75;
		text-transform: none;
	}

	.action-pill kbd {
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		text-transform: inherit;
		letter-spacing: inherit;
		padding: 0;
		border: none;
		background: none;
	}

	.midi-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.connected {
		font-size: 0.75rem;
		font-weight: 500;
		color: #4ade80;
		text-transform: lowercase;
		cursor: default;
	}

	.connect {
		font-size: 0.75rem;
		font-weight: 500;
		color: #a1a1aa;
		background: transparent;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		font-family: inherit;
		text-transform: lowercase;
	}

	.connect:hover {
		color: #e4e4e7;
		border-color: #52525b;
	}

	.connect-error {
		font-size: 0.625rem;
		color: #f87171;
		max-width: 12rem;
		text-align: right;
	}
</style>

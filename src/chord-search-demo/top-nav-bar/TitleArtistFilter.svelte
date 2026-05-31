<script lang="ts">
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import {
		TOP_NAV_FILTER_INPUT_HEIGHT,
		TOP_NAV_SONG_FILTER_WIDTH
	} from "../constants.js";
</script>

<input
	class="name-filter"
	type="text"
	placeholder="Filter by song name…"
	style="--song-filter-width: {TOP_NAV_SONG_FILTER_WIDTH}; --filter-input-height: {TOP_NAV_FILTER_INPUT_HEIGHT};"
	value={chordSearchDemoStore.titleFilter}
	oninput={(event) =>
		chordSearchDemoStore.setTitleFilter((event.currentTarget as HTMLInputElement).value)}
/>

<style>
	.name-filter {
		flex: 0 0 var(--song-filter-width);
		width: var(--song-filter-width);
		height: var(--filter-input-height);
		min-width: 0;
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0 0.625rem;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.15s;
	}

	.name-filter::placeholder {
		color: #52525b;
	}

	.name-filter:focus {
		border-color: rgba(99, 102, 241, 0.6);
	}
</style>

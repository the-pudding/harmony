<script lang="ts">
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
</script>

<input
	class="name-filter"
	type="text"
	placeholder="Filter by song or artist name…"
	value={chordSearchDemoStore.titleArtistFilter}
	oninput={(event) =>
		chordSearchDemoStore.setTitleArtistFilter((event.currentTarget as HTMLInputElement).value)}
/>

<style>
	.name-filter {
		flex: 1;
		min-width: 0;
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.375rem 0.625rem;
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

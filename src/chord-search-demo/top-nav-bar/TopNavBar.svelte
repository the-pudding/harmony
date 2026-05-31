<script lang="ts">
	import SearchProgression from "../SearchProgression.svelte";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import ArtistFilter from "./ArtistFilter.svelte";
	import TitleArtistFilter from "./TitleArtistFilter.svelte";
</script>

<nav class="top-nav" aria-label="Search filters and current progression">
	<ArtistFilter />
	<TitleArtistFilter />
	<div class="progression-wrap">
		<SearchProgression
			chords={chordSearchDemoStore.searchChords}
			fuzzySearch={chordSearchDemoStore.fuzzySearch}
			ignoreSlashBassNotes={chordSearchDemoStore.ignoreSlashBassNotes}
		/>
	</div>
</nav>

<style>
	.top-nav {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 5;
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(9, 9, 11, 0.92);
		border-bottom: 1px solid rgba(39, 39, 42, 0.8);
		backdrop-filter: blur(8px);
		box-sizing: border-box;
	}

	.progression-wrap {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}
</style>

<script lang="ts">
	import SearchProgression from "../SearchProgression.svelte";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
</script>

<div class="progression-wrap">
	<SearchProgression
		chords={chordSearchDemoStore.searchChords}
		fuzzySearch={chordSearchDemoStore.fuzzySearch}
		ignoreSlashBassNotes={chordSearchDemoStore.ignoreSlashBassNotes}
	/>
</div>

<style>
	.progression-wrap {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}
</style>

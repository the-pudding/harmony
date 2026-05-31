<script lang="ts">
	import ArtistFilterDropdown from "../ArtistFilterDropdown.svelte";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
</script>

<ArtistFilterDropdown
	artistOptions={chordSearchDemoStore.artistOptions}
	selectedArtist={chordSearchDemoStore.selectedArtist}
	onSelectedArtistChange={chordSearchDemoStore.setSelectedArtist}
/>

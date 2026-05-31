<script lang="ts">
	import ToggleSwitch from "./ToggleSwitch.svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
</script>

<section class="card">
	<h2>What counts as a chord (progression)?</h2>
	<div class="toggles">
		<ToggleSwitch
			checked={chordSearchDemoStore.bassAsRoot}
			onchange={chordSearchDemoStore.setBassAsRoot}
			label="🎸 When classifying, try first to treat the bass note as the root (before assuming it's a slash chord)"
		/>
		<ToggleSwitch
			checked={chordSearchDemoStore.ignoreSlashBassNotes}
			onchange={chordSearchDemoStore.setIgnoreSlashBassNotes}
			label="✂️ Ignore slash bass notes and just match only on the chord"
		/>
		<ToggleSwitch
			checked={chordSearchDemoStore.fuzzySearch}
			onchange={chordSearchDemoStore.setFuzzySearch}
			label="🧸 Fuzzy search (match on simplest version of chords, see FUZZY_SUFFIX_MAP)"
		/>
		<ToggleSwitch
			checked={chordSearchDemoStore.matchAtBeginningOnly}
			onchange={chordSearchDemoStore.setMatchAtBeginningOnly}
			label="▶️ Match only progressions that begin this way"
		/>
		<ToggleSwitch
			checked={chordSearchDemoStore.matchAtLeastTwice}
			onchange={chordSearchDemoStore.setMatchAtLeastTwice}
			label="🔁 Match only progressions where the search progression appears at least twice"
		/>
	</div>
</section>

<style>
	.card {
		background: rgba(24, 24, 27, 0.8);
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		margin: 0;
	}

	.toggles {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
</style>

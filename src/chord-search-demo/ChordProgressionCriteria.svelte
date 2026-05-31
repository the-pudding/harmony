<script lang="ts">
	import ToggleSwitch from "./ToggleSwitch.svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_INPUT_WIDTH,
		MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MAX,
		MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MIN
	} from "./constants.js";

	const handleMinNumChordsToCountAsAProgressionInput = (event: Event) => {
		const value = Number.parseInt((event.currentTarget as HTMLInputElement).value, 10);
		if (Number.isNaN(value)) return;
		chordSearchDemoStore.setMinNumChordsToCountAsAProgression(value);
	};
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
		<label class="number-field">
			A progression must have at least
			<input
				class="number-input"
				type="number"
				min={MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MIN}
				max={MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MAX}
				step={1}
				style="--number-input-width: {MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_INPUT_WIDTH};"
				value={chordSearchDemoStore.minNumChordsToCountAsAProgression}
				oninput={handleMinNumChordsToCountAsAProgressionInput}
			/>
			chords
		</label>
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

	.number-field {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: #e4e4e7;
	}

	.number-input {
		flex: 0 0 var(--number-input-width);
		width: var(--number-input-width);
		height: 1.875rem;
		margin: 0;
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0 0.5rem;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.15s;
	}

	.number-input:focus {
		border-color: rgba(99, 102, 241, 0.6);
	}
</style>

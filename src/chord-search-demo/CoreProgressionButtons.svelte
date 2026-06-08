<script lang="ts">
	import { onMount } from "svelte";
	import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";

	type Progression = { name: string; progression: string };

	let progressions = $state<Progression[]>([]);

	onMount(async () => {
		try {
			const res = await fetch("/data/core-progressions.csv");
			const text = await res.text();
			const lines = text.trim().split("\n").slice(1); // skip header
			progressions = lines.map((line) => {
				const comma = line.indexOf(",");
				return { name: line.slice(0, comma).trim(), progression: line.slice(comma + 1).trim() };
			});
		} catch {
			// silently fail — buttons just won't appear
		}
	});

	const setProgression = (progressionStr: string) => {
		const tokens = progressionStr.split("-");
		const parsed = romanTokensToParsedProgression(tokens);
		if (!parsed) return;
		chordSearchDemoStore.getProgressionSearch().setProgression(parsed);
		chordSearchDemoStore.syncSearch();
	};

	const activeProgression = $derived.by(() => {
		const searchChords = chordSearchDemoStore.searchChords;
		if (searchChords.length === 0) return null;
		// Match by comparing the search chords to each progression's parsed result
		for (const p of progressions) {
			const parsed = romanTokensToParsedProgression(p.progression.split("-"));
			if (!parsed || parsed.length !== searchChords.length) continue;
			const matches = parsed.every(
				(chord, i) =>
					chord.rootPitchClass === searchChords[i].rootPitchClass &&
					chord.suffix === searchChords[i].suffix
			);
			if (matches) return p.progression;
		}
		return null;
	});
</script>

{#if progressions.length > 0}
	<div class="button-row">
		{#each progressions as p (p.progression)}
			<button
				class="prog-btn"
				class:active={activeProgression === p.progression}
				onclick={() => setProgression(p.progression)}
				title={p.progression}
			>
				{p.name}
			</button>
		{/each}
	</div>
{/if}

<style>
	.button-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.prog-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		color: #a1a1aa;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		white-space: nowrap;
	}

	.prog-btn:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.2);
		color: #e4e4e7;
	}

	.prog-btn.active {
		background: rgba(137, 180, 250, 0.15);
		border-color: rgba(137, 180, 250, 0.4);
		color: #89b4fa;
	}
</style>

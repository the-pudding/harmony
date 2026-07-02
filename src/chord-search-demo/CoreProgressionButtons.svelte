<script lang="ts">
	import coreProgressions from "$data/core-progressions.js";
	import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";

	type Progression = { name: string; chordProgression: string; description: string };

	type Props = {
		activeProgression?: string | null;
		onselect?: (progression: string | null) => void;
	};

	let { activeProgression: activeProp = undefined, onselect }: Props = $props();

	const progressions: Progression[] = coreProgressions;

	const storeActiveProgression = $derived.by(() => {
		const searchChords = chordSearchDemoStore.searchChords;
		if (searchChords.length === 0) return null;
		for (const p of progressions) {
			const parsed = romanTokensToParsedProgression(p.chordProgression.split("-"));
			if (!parsed || parsed.length !== searchChords.length) continue;
			const isMatch = parsed.every(
				(chord, i) =>
					chord.rootPitchClass === searchChords[i].rootPitchClass &&
					chord.suffix === searchChords[i].suffix
			);
			if (isMatch) return p.chordProgression;
		}
		return null;
	});

	const activeProgression = $derived(
		activeProp !== undefined ? activeProp : storeActiveProgression
	);

	const handleProgressionClick = (chordProgression: string) => {
		if (onselect !== undefined) {
			onselect(activeProgression === chordProgression ? null : chordProgression);
			return;
		}
		if (activeProgression === chordProgression) {
			chordSearchDemoStore.clearSearch();
			return;
		}
		const tokens = chordProgression.split("-");
		const parsed = romanTokensToParsedProgression(tokens);
		if (!parsed) return;
		chordSearchDemoStore.getProgressionSearch().setProgression(parsed);
		chordSearchDemoStore.syncSearch();
	};
</script>

{#if progressions.length > 0}
	<div class="button-row">
		{#each progressions as p (p.name)}
			<button
				class="prog-btn"
				class:active={activeProgression === p.chordProgression}
				onclick={() => handleProgressionClick(p.chordProgression)}
				title={p.chordProgression}
			>
				<span class="prog-name">{p.name}</span>
				<span class="prog-chords">{p.chordProgression}</span>
				{#if p.description}
					<span class="prog-description">{p.description}</span>
				{/if}
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
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		color: #a1a1aa;
		padding: 0.375rem 0.625rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		white-space: nowrap;
		text-align: left;
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

	.prog-name {
		font-size: 0.75rem;
		color: inherit;
	}

	.prog-chords {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.7rem;
		color: rgba(161, 161, 170, 0.7);
	}

	.prog-btn.active .prog-chords {
		color: rgba(137, 180, 250, 0.7);
	}

	.prog-btn:hover .prog-chords {
		color: rgba(228, 228, 231, 0.7);
	}

	.prog-description {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.5);
	}

	.prog-btn.active .prog-description {
		color: rgba(137, 180, 250, 0.5);
	}

	.prog-btn:hover .prog-description {
		color: rgba(228, 228, 231, 0.5);
	}
</style>

<script lang="ts">
	import FinalAnnotatedSong from "../../define-chord-progression/components/FinalAnnotatedSong.svelte";
	import { getCachedV2MatchResult } from "../match-algo-v2-logic/matchResultCache.js";
	import type { MatchWeights } from "../match-algo-v2-logic/weights.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import coreProgressionsData from "$data/core-progressions.js";

	type Props = {
		song: GroupedSong;
		weights: MatchWeights;
		interactive?: boolean;
	};

	const { song, weights, interactive = false }: Props = $props();

	let pinnedProgression = $state<string | null>(null);

	const v2Result = $derived(
		getCachedV2MatchResult(song, coreProgressionsData, weights)
	);

	const togglePinned = (
		current: string | null,
		chordProgression: string
	): string | null => (current === chordProgression ? null : chordProgression);

	const ignoreSelect = (_chordProgression: string) => {};
</script>

<section class="comparison-column">
	<div class="step-header">
		<h3 class="step-label">v2</h3>
		<span class="coverage-badge">{v2Result.explainedPercent}% explained</span>
	</div>
	<FinalAnnotatedSong
		compact
		showMetadata={false}
		lockMatchListHeight
		{song}
		matches={v2Result.matches}
		annotations={v2Result.annotations}
		explainedPercent={v2Result.explainedPercent}
		activeProgression={interactive ? pinnedProgression : null}
		onselect={interactive
			? (chordProgression) => {
					pinnedProgression = togglePinned(
						pinnedProgression,
						chordProgression
					);
				}
			: ignoreSelect}
	/>
</section>

<style>
	.comparison-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
		padding: 1rem;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		background: #0c0c0e;
	}

	.step-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.step-label {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #a1a1aa;
	}

	.coverage-badge {
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 0.25rem;
		background: rgba(99, 102, 241, 0.15);
		border: 1px solid rgba(99, 102, 241, 0.3);
		color: rgba(165, 180, 252, 0.9);
	}
</style>

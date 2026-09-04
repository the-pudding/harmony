<script lang="ts">
	import FinalAnnotatedSong from "../../define-chord-progression/components/FinalAnnotatedSong.svelte";
	import {
		selectFinalProgressions,
		buildFinalChordAnnotations
	} from "../../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
	import {
		findStrictSubsetKeys,
		applySubsetFlag
	} from "../../define-chord-progression/progression-matching-logic/strictSubsetProgressions.js";
	import { matchSongV2 } from "../match-algo-v2-logic/matchSongV2.js";
	import type { MatchWeights } from "../match-algo-v2-logic/weights.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import coreProgressionsData from "$data/core-progressions.js";
	import { getChordMatchingChallenges } from "../../../../data/hand-reviewed-songs.js";

	type Props = {
		song: GroupedSong;
		weights: MatchWeights;
		interactive: boolean;
	};

	const { song, weights, interactive }: Props = $props();

	let pinnedV1Progression = $state<string | null>(null);
	let pinnedV2Progression = $state<string | null>(null);

	const v2Result = $derived(matchSongV2(song, coreProgressionsData, weights));

	const v1Selection = $derived(
		selectFinalProgressions(song, coreProgressionsData)
	);

	const v1StrictSubsetKeys = $derived(
		findStrictSubsetKeys([
			...v1Selection.coreMatches,
			...v1Selection.gapCandidates
		])
	);

	const v1CoreSelected = $derived(
		applySubsetFlag(v1Selection.coreSelected, v1StrictSubsetKeys)
	);

	const v1GapSelected = $derived(
		applySubsetFlag(v1Selection.gapSelected, v1StrictSubsetKeys)
	);

	const v1Matches = $derived([...v1CoreSelected, ...v1GapSelected]);

	const v1Annotations = $derived(
		buildFinalChordAnnotations(song, {
			coreSelected: v1CoreSelected,
			gapSelected: v1GapSelected
		})
	);

	const challenge = $derived(getChordMatchingChallenges(song.songKey));

	const togglePinned = (
		current: string | null,
		chordProgression: string
	): string | null => (current === chordProgression ? null : chordProgression);

	const ignoreSelect = (_chordProgression: string) => {};
</script>

<article class="slide">
	<h2 class="result-heading">
		{song.title}
		<span class="artist">{song.artists.join(", ")}</span>
	</h2>
	{#if challenge}
		<p class="challenge">{challenge}</p>
	{/if}

	<div class="comparison-columns">
		<section class="comparison-column">
			<div class="step-header">
				<h3 class="step-label">v1</h3>
				<span class="coverage-badge">{v1Selection.explainedPercent}% explained</span>
			</div>
			<FinalAnnotatedSong
				compact
				showMetadata={false}
				lockMatchListHeight
				{song}
				matches={v1Matches}
				annotations={v1Annotations}
				explainedPercent={v1Selection.explainedPercent}
				activeProgression={interactive ? pinnedV1Progression : null}
				onselect={interactive
					? (chordProgression) => {
							pinnedV1Progression = togglePinned(
								pinnedV1Progression,
								chordProgression
							);
						}
					: ignoreSelect}
			/>
		</section>
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
				activeProgression={interactive ? pinnedV2Progression : null}
				onselect={interactive
					? (chordProgression) => {
							pinnedV2Progression = togglePinned(
								pinnedV2Progression,
								chordProgression
							);
						}
					: ignoreSelect}
			/>
		</section>
	</div>
</article>

<style>
	.slide {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	.result-heading {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #f4f4f5;
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.artist {
		font-size: 0.75rem;
		font-weight: 400;
		color: #71717a;
	}

	.challenge {
		margin: 0;
		font-size: 0.7rem;
		color: #a1a1aa;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.comparison-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		align-items: start;
	}

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

	@media (max-width: 56rem) {
		.comparison-columns {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
	import { formatMatchRatePercent } from "../../progression-matching-logic/progressionMatchAnalysis.js";
	import ProgressionCoverageBar from "./ProgressionCoverageBar.svelte";

	type Props = {
		matchRatePercent: number;
		matchingSongCount: number;
		active: boolean;
	};

	let { matchRatePercent, matchingSongCount, active }: Props = $props();

	const matchRateLabel = $derived(formatMatchRatePercent(matchRatePercent));
	const matchingSongLabel = $derived(
		matchingSongCount === 1 ? "1 song" : `${matchingSongCount} songs`
	);
</script>

<span class="stats" class:active
	>matched in <span class="match-rate">{matchRateLabel}%</span> of all songs <span class="song-count"
		>({matchingSongLabel})</span
	></span
>
<ProgressionCoverageBar percent={matchRatePercent} {active} />

<style>
	.stats {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.85);
	}

	.stats.active {
		color: rgba(137, 180, 250, 0.85);
	}

	.match-rate {
		color: #fff;
	}

	.song-count {
		color: rgba(161, 161, 170, 0.45);
	}
</style>

<script lang="ts">
	import ProgressionCoverageBar from "./ProgressionCoverageBar.svelte";

	type Props = {
		matchRatePercent: number;
		active: boolean;
	};

	let { matchRatePercent, active }: Props = $props();
</script>

<span class="stats" class:active>matched in {matchRatePercent}% of all songs</span>
<ProgressionCoverageBar percent={matchRatePercent} {active} />

<style>
	.stats {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.85);
	}

	.stats.active {
		color: rgba(137, 180, 250, 0.85);
	}
</style>

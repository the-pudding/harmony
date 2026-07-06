<script lang="ts">
	import ProgressionCoverageBar from "./ProgressionCoverageBar.svelte";

	type Props = {
		matchCount: number;
		coveragePercent: number;
		active: boolean;
	};

	let { matchCount, coveragePercent, active }: Props = $props();

	const coveragePercentRounded = $derived(Math.round(coveragePercent));
</script>

<span class="stats" class:active>{matchCount}× · {coveragePercentRounded}%</span
>
<ProgressionCoverageBar percent={coveragePercent} {active} />

<style>
	.stats {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.85);
	}

	.stats.active {
		color: rgba(137, 180, 250, 0.85);
	}
</style>

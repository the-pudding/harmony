<script lang="ts">
	type Props = {
		percent: number;
		active: boolean;
	};

	let { percent, active }: Props = $props();

	const COVERAGE_PERCENT_MAX = 100;
	const width = $derived(
		`${Math.min(Math.max(percent, 0), COVERAGE_PERCENT_MAX)}%`
	);
</script>

<div class="coverage-bar" class:active aria-hidden="true">
	<div class="coverage-fill" style:width></div>
</div>

<style>
	.coverage-bar {
		width: 100%;
		height: 0.25rem;
		margin-top: 0.125rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.coverage-fill {
		height: 100%;
		border-radius: inherit;
		background: rgba(161, 161, 170, 0.75);
		transition: width 0.2s ease;
	}

	.coverage-bar.active .coverage-fill {
		background: rgba(137, 180, 250, 0.85);
	}
</style>

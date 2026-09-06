<script lang="ts">
	import { humanizeScale } from "../../../../data/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { PALETTE_FILL_HOVER_COLOR_PERCENT } from "./progressionColors.js";

	const COVERAGE_PERCENT_MAX = 100;
	const COVERAGE_FILL_INACTIVE_OPACITY = 0.12;
	const COVERAGE_FILL_ACTIVE_OPACITY = 0.22;
	const COVERAGE_FILL_HOVER_OPACITY = 0.1;

	type Props = {
		match: ProgressionWithMatchStats;
		active: boolean;
		onselect: (chordProgression: string) => void;
		onhover?: (chordProgression: string) => void;
		onunhover?: () => void;
		borderColor?: string;
		dashed?: boolean;
		fillColor?: string;
	};

	let {
		match,
		active,
		onselect,
		onhover,
		onunhover,
		borderColor,
		dashed = false,
		fillColor
	}: Props = $props();

	const scaleName = $derived(humanizeScale(match.scale));
	const buttonTitle = $derived(
		match.isCoreProgression
			? `${match.chordProgression} (scale: ${scaleName})`
			: match.chordProgression
	);

	const coveragePercentRounded = $derived(Math.round(match.coveragePercent));
	const coverageFillWidth = $derived(
		`${Math.min(Math.max(match.coveragePercent, 0), COVERAGE_PERCENT_MAX)}%`
	);
	const showChordProgression = $derived(match.name !== match.chordProgression);
</script>

<button
	class="prog-btn"
	class:active
	class:custom-border={borderColor !== undefined}
	class:palette-fill={fillColor !== undefined}
	class:dashed
	style:--prog-btn-border-color={borderColor}
	style:--prog-btn-fill-color={fillColor}
	style:--palette-fill-hover-percent={PALETTE_FILL_HOVER_COLOR_PERCENT}
	style:--coverage-fill-inactive-opacity={COVERAGE_FILL_INACTIVE_OPACITY}
	style:--coverage-fill-active-opacity={COVERAGE_FILL_ACTIVE_OPACITY}
	style:--coverage-fill-hover-opacity={COVERAGE_FILL_HOVER_OPACITY}
	onclick={() => onselect(match.chordProgression)}
	onmouseenter={() => onhover?.(match.chordProgression)}
	onmouseleave={() => onunhover?.()}
	title={buttonTitle}
>
	<div class="coverage-fill" aria-hidden="true" style:width={coverageFillWidth}></div>
	<span class="prog-btn-content">
		<span class="prog-main">
			{#if match.name}
				<span class="prog-name">{match.name}</span>
			{/if}
			{#if showChordProgression}
				<span class="prog-chords">{match.chordProgression}</span>
			{/if}
		</span>
		<span class="prog-percent">{match.matchCount}× <b>{coveragePercentRounded}%</b></span>
	</span>
</button>

<style>
	.prog-btn {
		position: relative;
		display: flex;
		flex-direction: row;
		align-items: baseline;
		gap: 0.375rem;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.3rem;
		color: #a1a1aa;
		padding: 0.25rem 0.375rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		text-align: left;
		overflow-wrap: anywhere;
		overflow: hidden;
	}

	.coverage-fill {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 0;
		border-radius: inherit;
		background: rgba(161, 161, 170, var(--coverage-fill-inactive-opacity));
		transition: width 0.2s ease;
		pointer-events: none;
	}

	.prog-btn-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 0.375rem;
		width: 100%;
		min-width: 0;
	}

	.prog-main {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.375rem;
		flex: 1;
		min-width: 0;
	}

	.prog-btn:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.2);
		color: #e4e4e7;
	}

	.prog-btn:hover .coverage-fill {
		background: rgba(228, 228, 231, var(--coverage-fill-hover-opacity));
	}

	.prog-btn.custom-border:not(.active) {
		border-color: var(--prog-btn-border-color);
	}

	.prog-btn.custom-border:hover:not(.active) {
		border-color: color-mix(in srgb, var(--prog-btn-border-color) 70%, white);
	}

	.prog-btn.palette-fill:not(.active) {
		background: var(--prog-btn-fill-color);
	}

	.prog-btn.palette-fill:hover:not(.active) {
		background: color-mix(
			in srgb,
			var(--prog-btn-fill-color) calc(var(--palette-fill-hover-percent) * 1%),
			white
		);
	}

	.prog-btn.dashed:not(.active) {
		border-style: dashed;
	}

	.prog-btn.active {
		background: rgba(137, 180, 250, 0.15);
		border-color: rgba(137, 180, 250, 0.4);
		color: #89b4fa;
	}

	.prog-btn.active .coverage-fill {
		background: rgba(137, 180, 250, var(--coverage-fill-active-opacity));
	}

	.prog-name {
		font-size: 0.625rem;
		color: inherit;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.prog-chords {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.6rem;
		color: rgba(161, 161, 170, 0.7);
		white-space: nowrap;
		flex: 0 0 auto;
	}

	.prog-btn.active .prog-chords {
		color: rgba(137, 180, 250, 0.7);
	}

	.prog-btn:hover .prog-chords {
		color: rgba(228, 228, 231, 0.7);
	}

	.prog-percent {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.6rem;
		color: rgba(161, 161, 170, 0.55);
		flex-shrink: 0;
	}

	.prog-btn.active .prog-percent {
		color: rgba(137, 180, 250, 0.6);
	}

	.prog-btn:hover .prog-percent {
		color: rgba(228, 228, 231, 0.6);
	}
</style>

<script lang="ts">
	import { humanizeScale } from "../../../../data/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";

	type Props = {
		match: ProgressionWithMatchStats;
		active: boolean;
		onselect: (chordProgression: string) => void;
		onhover?: (chordProgression: string) => void;
		onunhover?: () => void;
		borderColor?: string;
		dashed?: boolean;
	};

	let { match, active, onselect, onhover, onunhover, borderColor, dashed = false }: Props =
		$props();

	const scaleName = $derived(humanizeScale(match.scale));
	const buttonTitle = $derived(
		match.isCoreProgression
			? `${match.chordProgression} (scale: ${scaleName})`
			: match.chordProgression
	);

	const coveragePercentRounded = $derived(Math.round(match.coveragePercent));
</script>

<button
	class="prog-btn"
	class:active
	class:custom-border={borderColor !== undefined}
	class:dashed
	style:--prog-btn-border-color={borderColor}
	onclick={() => onselect(match.chordProgression)}
	onmouseenter={() => onhover?.(match.chordProgression)}
	onmouseleave={() => onunhover?.()}
	title={buttonTitle}
>
	{#if match.name}
		<span class="prog-name">{match.name}</span>
	{/if}
	<span class="prog-chords">{match.chordProgression}</span>
	<span class="prog-percent">{coveragePercentRounded}%</span>
</button>

<style>
	.prog-btn {
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
	}

	.prog-btn:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.2);
		color: #e4e4e7;
	}

	.prog-btn.custom-border:not(.active) {
		border-color: var(--prog-btn-border-color);
	}

	.prog-btn.custom-border:hover:not(.active) {
		border-color: color-mix(in srgb, var(--prog-btn-border-color) 70%, white);
	}

	.prog-btn.dashed:not(.active) {
		border-style: dashed;
	}

	.prog-btn.active {
		background: rgba(137, 180, 250, 0.15);
		border-color: rgba(137, 180, 250, 0.4);
		color: #89b4fa;
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
		flex: 1;
		min-width: 0;
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

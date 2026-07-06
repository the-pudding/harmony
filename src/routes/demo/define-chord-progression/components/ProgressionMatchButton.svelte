<script lang="ts">
	import type { Snippet } from "svelte";
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
		stats?: Snippet<[{ active: boolean }]>;
	};

	let {
		match,
		active,
		onselect,
		onhover,
		onunhover,
		borderColor,
		dashed = false,
		stats
	}: Props = $props();

	const scaleName = $derived(humanizeScale(match.scale));
	const scaleLabel = $derived(`scale: ${scaleName}`);

	const buttonTitle = $derived(
		match.isCoreProgression
			? `${match.chordProgression} (${scaleLabel})`
			: match.chordProgression
	);
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
	{#if match.isCoreProgression}
		<span class="prog-scale"
			><span class="prog-scale-label">scale:</span> {scaleName}</span
		>
	{/if}
	<span class="prog-chords">{match.chordProgression}</span>
	{#if stats}
		{@render stats({ active })}
	{/if}
</button>

<style>
	.prog-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
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
		font-size: 0.75rem;
		color: inherit;
		white-space: nowrap;
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

	.prog-scale {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.85);
	}

	.prog-scale-label {
		color: rgba(161, 161, 170, 0.55);
	}

	.prog-btn.active .prog-scale {
		color: rgba(137, 180, 250, 0.85);
	}

	.prog-btn.active .prog-scale-label {
		color: rgba(137, 180, 250, 0.55);
	}

	.prog-btn:hover .prog-scale {
		color: rgba(228, 228, 231, 0.85);
	}

	.prog-btn:hover .prog-scale-label {
		color: rgba(228, 228, 231, 0.55);
	}
</style>

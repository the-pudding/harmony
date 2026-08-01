<script lang="ts">
	import type { Snippet } from "svelte";
	import { humanizeScale } from "../../../../data/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";

	export type VariantTooltipRow = {
		chordProgression: string;
		matchingSongCount: number;
	};

	const TOOLTIP_GAP_PX = 6;

	type Props = {
		match: ProgressionWithMatchStats;
		active: boolean;
		onselect: (chordProgression: string) => void;
		onhover?: (chordProgression: string) => void;
		onunhover?: () => void;
		borderColor?: string;
		dashed?: boolean;
		variantTooltipRows?: VariantTooltipRow[];
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
		variantTooltipRows = [],
		stats
	}: Props = $props();

	let badgeElement = $state<HTMLSpanElement | null>(null);
	let tooltipVisible = $state(false);
	let tooltipLeftPx = $state(0);
	let tooltipTopPx = $state(0);

	const scaleName = $derived(humanizeScale(match.scale));
	const scaleLabel = $derived(`scale: ${scaleName}`);

	const buttonTitle = $derived(
		match.isCoreProgression
			? `${match.chordProgression} (${scaleLabel})`
			: match.chordProgression
	);

	const otherVariantCount = $derived(
		Math.max(0, variantTooltipRows.length - 1)
	);

	const sortedTooltipRows = $derived(
		[...variantTooltipRows].sort(
			(a, b) =>
				b.matchingSongCount - a.matchingSongCount ||
				a.chordProgression.localeCompare(b.chordProgression)
		)
	);

	const portalToBody = (node: HTMLElement) => {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	};

	const showVariantTooltip = () => {
		if (!badgeElement) return;
		const rect = badgeElement.getBoundingClientRect();
		tooltipLeftPx = rect.left;
		tooltipTopPx = rect.top - TOOLTIP_GAP_PX;
		tooltipVisible = true;
	};

	const hideVariantTooltip = () => {
		tooltipVisible = false;
	};
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
	title={otherVariantCount > 0 ? undefined : buttonTitle}
>
	{#if match.name}
		<span class="prog-name">{match.name}</span>
	{/if}
	{#if match.isCoreProgression}
		<span class="prog-scale"
			><span class="prog-scale-label">scale:</span> {scaleName}</span
		>
	{/if}
	<span class="prog-chords-row">
		<span class="prog-chords">{match.chordProgression}</span>
		{#if otherVariantCount > 0}
			<span
				bind:this={badgeElement}
				class="variants-badge"
				role="img"
				aria-label="variants: {sortedTooltipRows
					.map(
						(row) =>
							`${row.matchingSongCount} songs — ${row.chordProgression}`
					)
					.join('; ')}"
				onmouseenter={showVariantTooltip}
				onmouseleave={hideVariantTooltip}
			>
				+{otherVariantCount}
			</span>
		{/if}
	</span>
	{#if stats}
		{@render stats({ active })}
	{/if}
</button>

{#if tooltipVisible}
	<div
		class="progression-variant-tooltip"
		role="tooltip"
		style:left="{tooltipLeftPx}px"
		style:top="{tooltipTopPx}px"
		use:portalToBody
	>
		{#each sortedTooltipRows as row (row.chordProgression)}
			<div class="progression-variant-tooltip-row">
				<span class="progression-variant-tooltip-count"
					>{row.matchingSongCount}</span
				>
				<span class="progression-variant-tooltip-sep">-</span>
				<span class="progression-variant-tooltip-progression"
					>{row.chordProgression}</span
				>
			</div>
		{/each}
	</div>
{/if}

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

	.prog-chords-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
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

	.variants-badge {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.6rem;
		color: rgba(161, 161, 170, 0.45);
		cursor: default;
		padding: 0 0.2rem;
		border: 1px solid rgba(161, 161, 170, 0.2);
		border-radius: 0.2rem;
		line-height: 1.4;
	}

	.prog-btn.active .variants-badge {
		color: rgba(137, 180, 250, 0.5);
		border-color: rgba(137, 180, 250, 0.25);
	}

	.prog-btn:hover .variants-badge {
		color: rgba(228, 228, 231, 0.5);
		border-color: rgba(228, 228, 231, 0.25);
	}

	:global(.progression-variant-tooltip) {
		position: fixed;
		transform: translateY(-100%);
		background: #18181b;
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(228, 228, 231, 0.9);
		padding: 0.4rem 0.5rem;
		border-radius: 0.25rem;
		pointer-events: none;
		z-index: 1000;
		width: max-content;
		max-width: min(20rem, calc(100vw - 1rem));
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.65rem;
		line-height: 1.5;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	:global(.progression-variant-tooltip-row) {
		display: grid;
		grid-template-columns: max-content max-content max-content;
		column-gap: 0.4rem;
		align-items: baseline;
		white-space: nowrap;
	}

	:global(.progression-variant-tooltip-count) {
		color: rgba(255, 255, 255, 0.95);
		font-variant-numeric: tabular-nums;
		text-align: left;
	}

	:global(.progression-variant-tooltip-sep) {
		color: rgba(161, 161, 170, 0.55);
	}

	:global(.progression-variant-tooltip-progression) {
		color: rgba(228, 228, 231, 0.85);
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

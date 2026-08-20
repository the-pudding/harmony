<script lang="ts">
	import type { SongVectorOptions } from "../embedding/vectors/index.js";
	import {
		WEIGHTING_DESCRIPTION_SECTIONS,
		weightingDescriptions
	} from "../weightingDescriptions.js";

	type Props = {
		options: SongVectorOptions;
		onChange: (options: SongVectorOptions) => void;
	};

	const { options, onChange }: Props = $props();

	const TOGGLE_ON_LABEL = "on";
	const TOGGLE_OFF_LABEL = "off";

	const toggles = $derived([
		{
			key: "useTfIdf" as const,
			isActive: options.useTfIdf,
			toggle: () => onChange({ ...options, useTfIdf: !options.useTfIdf })
		},
		{
			key: "l2Normalize" as const,
			isActive: options.l2Normalize,
			toggle: () =>
				onChange({ ...options, l2Normalize: !options.l2Normalize })
		},
		{
			key: "binary" as const,
			isActive: options.weighting === "binary",
			toggle: () =>
				onChange({
					...options,
					weighting: options.weighting === "binary" ? "raw" : "binary"
				})
		},
		{
			key: "weightChorus" as const,
			isActive: options.weightChorus,
			toggle: () =>
				onChange({ ...options, weightChorus: !options.weightChorus })
		}
	]);
</script>

<div class="weighting-controls" role="group" aria-label="Vector weighting">
	{#each toggles as toggle (toggle.key)}
		{@const description = weightingDescriptions[toggle.key]}
		<button
			class="weighting-toggle"
			class:weighting-toggle-active={toggle.isActive}
			type="button"
			aria-pressed={toggle.isActive}
			aria-describedby="weighting-tooltip-{toggle.key}"
			onclick={toggle.toggle}
		>
			<span class="weighting-label">{description.label}</span>
			<span class="weighting-status"
				>{toggle.isActive ? TOGGLE_ON_LABEL : TOGGLE_OFF_LABEL}</span
			>
			<span
				id="weighting-tooltip-{toggle.key}"
				class="weighting-tooltip"
				role="tooltip"
			>
				<span class="weighting-tooltip-summary">{description.summary}</span>
				{#each WEIGHTING_DESCRIPTION_SECTIONS as section (section.key)}
					<span class="weighting-tooltip-section">
						<span class="weighting-tooltip-section-label">{section.label}</span>
						{description[section.key]}
					</span>
				{/each}
			</span>
		</button>
	{/each}
</div>

<style>
	.weighting-controls {
		display: flex;
		gap: 0.25rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.125rem;
	}

	.weighting-toggle {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.7rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.weighting-toggle:hover {
		color: #e4e4e7;
	}

	.weighting-toggle-active {
		background: rgba(99, 102, 241, 0.3);
		color: #f4f4f5;
	}

	.weighting-status {
		font-size: 0.55rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #71717a;
	}

	.weighting-toggle-active .weighting-status {
		color: rgba(165, 180, 252, 0.95);
	}

	.weighting-tooltip {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 18rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(9, 9, 11, 0.98);
		color: #d4d4d8;
		font-size: 0.65rem;
		font-weight: 400;
		line-height: 1.5;
		text-align: left;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			visibility 0.15s ease;
	}

	.weighting-toggle:hover .weighting-tooltip,
	.weighting-toggle:focus-visible .weighting-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.weighting-tooltip-summary {
		color: #f4f4f5;
	}

	.weighting-tooltip-section {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		color: #a1a1aa;
	}

	.weighting-tooltip-section-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}
</style>

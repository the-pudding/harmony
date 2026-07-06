<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		expandLabel: string;
		collapseLabel: string;
		defaultExpanded?: boolean;
		expanded?: boolean;
		children: Snippet;
	};

	let {
		expandLabel,
		collapseLabel,
		defaultExpanded = false,
		expanded = $bindable(defaultExpanded),
		children
	}: Props = $props();
</script>

<div class="collapsible-panel" class:collapsible-panel-expanded={expanded}>
	<button
		class="collapsible-panel-toggle"
		onclick={() => (expanded = !expanded)}
		aria-expanded={expanded}
	>
		<span class="collapsible-panel-toggle-label">
			{expanded ? collapseLabel : expandLabel}
		</span>
		<svg
			class="collapsible-panel-chevron"
			class:collapsible-panel-chevron-collapsed={!expanded}
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M4 6l4 4 4-4"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if expanded}
		<div class="collapsible-panel-content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.collapsible-panel {
		--collapsible-panel-border-color: rgba(63, 63, 70, 0.9);
		--collapsible-panel-toggle-bg: rgba(39, 39, 42, 0.75);
		--collapsible-panel-toggle-bg-hover: rgba(63, 63, 70, 0.85);
		--collapsible-panel-content-bg: rgba(24, 24, 27, 0.45);
		border: 1px solid var(--collapsible-panel-border-color);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.collapsible-panel-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: none;
		background: var(--collapsible-panel-toggle-bg);
		color: #a1a1aa;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 0.8125rem;
		font-style: italic;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.collapsible-panel-expanded .collapsible-panel-toggle {
		border-bottom: 1px solid var(--collapsible-panel-border-color);
	}

	.collapsible-panel-toggle:hover {
		background: var(--collapsible-panel-toggle-bg-hover);
		color: #e4e4e7;
	}

	.collapsible-panel-toggle:focus-visible {
		outline: 2px solid rgba(137, 180, 250, 0.8);
		outline-offset: -2px;
	}

	.collapsible-panel-toggle:hover .collapsible-panel-chevron {
		color: #d4d4d8;
	}

	.collapsible-panel-toggle-label {
		line-height: 1.4;
	}

	.collapsible-panel-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--collapsible-panel-content-bg);
	}

	.collapsible-panel-chevron {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: #71717a;
		transition:
			transform 0.2s ease,
			color 0.15s ease;
	}

	.collapsible-panel-chevron-collapsed {
		transform: rotate(-90deg);
	}
</style>

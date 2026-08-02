<script lang="ts">
	import {
		HARMONY_MAP_VIEWS,
		type HarmonyMapView
	} from "../harmonyMapUrlState.js";
	import { viewLabels } from "./tabDescriptions.js";

	type Props = {
		view: HarmonyMapView;
		onSelect: (view: HarmonyMapView) => void;
	};

	const { view, onSelect }: Props = $props();
</script>

<div class="tab-bar" role="tablist">
	{#each HARMONY_MAP_VIEWS as candidate (candidate)}
		<button
			class="tab"
			class:tab-active={candidate === view}
			role="tab"
			aria-selected={candidate === view}
			onclick={() => onSelect(candidate)}
		>
			{viewLabels[candidate]}
		</button>
	{/each}
</div>

<style>
	.tab-bar {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.7);
	}

	.tab {
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: #71717a;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.tab:hover {
		color: #d4d4d8;
	}

	.tab-active {
		color: #f4f4f5;
		border-bottom-color: #6366f1;
	}
</style>

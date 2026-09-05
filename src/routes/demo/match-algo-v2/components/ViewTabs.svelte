<script lang="ts">
	import {
		MATCH_ALGO_V2_TAB_LABELS,
		MATCH_ALGO_V2_TABS,
		type MatchAlgoV2Tab
	} from "../matchAlgoV2UrlParams.js";

	type Props = {
		tab: MatchAlgoV2Tab;
		onselect: (tab: MatchAlgoV2Tab) => void;
	};

	const { tab, onselect }: Props = $props();
</script>

<div class="tabs" role="tablist" aria-label="Match algo views">
	{#each MATCH_ALGO_V2_TABS as tabId (tabId)}
		<button
			type="button"
			role="tab"
			id="match-algo-tab-{tabId}"
			aria-controls="match-algo-panel-{tabId}"
			aria-selected={tab === tabId}
			class:active={tab === tabId}
			onclick={() => onselect(tabId)}
		>
			{MATCH_ALGO_V2_TAB_LABELS[tabId]}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.2rem;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		background: #0c0c0e;
		width: fit-content;
	}

	button {
		appearance: none;
		border: none;
		background: transparent;
		color: #71717a;
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.4rem 0.85rem;
		border-radius: 0.35rem;
		cursor: pointer;
	}

	button.active {
		background: #18181b;
		color: #f4f4f5;
	}

	button:hover:not(.active) {
		color: #a1a1aa;
	}
</style>

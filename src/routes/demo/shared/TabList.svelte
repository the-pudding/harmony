<script lang="ts" generics="T extends string">
	type Props = {
		tabs: readonly T[];
		labels: Record<T, string>;
		tab: T;
		idPrefix: string;
		ariaLabel: string;
		onselect: (tab: T) => void;
	};

	const { tabs, labels, tab, idPrefix, ariaLabel, onselect }: Props = $props();
</script>

<div class="tabs" role="tablist" aria-label={ariaLabel}>
	{#each tabs as tabId (tabId)}
		<button
			type="button"
			role="tab"
			id="{idPrefix}-tab-{tabId}"
			aria-controls="{idPrefix}-panel-{tabId}"
			aria-selected={tab === tabId}
			class:active={tab === tabId}
			onclick={() => onselect(tabId)}
		>
			{labels[tabId]}
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

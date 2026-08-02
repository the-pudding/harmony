<script lang="ts" generics="TabId extends string">
	type Tab = { id: TabId; label: string };

	type Props = {
		tabs: Tab[];
		activeId: TabId;
		onSelect: (id: TabId) => void;
	};

	const { tabs, activeId, onSelect }: Props = $props();
</script>

<div class="tabs" role="tablist">
	{#each tabs as tab (tab.id)}
		<button
			class="tab"
			class:tab-active={tab.id === activeId}
			role="tab"
			aria-selected={tab.id === activeId}
			onclick={() => onSelect(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		gap: 0.125rem;
		padding: 0.125rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	.tab {
		flex: 1;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #71717a;
		font-family: inherit;
		font-size: 0.7rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		transition:
			color 0.15s ease,
			background 0.15s ease;
	}

	.tab:hover {
		color: #d4d4d8;
	}

	.tab-active {
		background: rgba(99, 102, 241, 0.3);
		color: #f4f4f5;
	}
</style>

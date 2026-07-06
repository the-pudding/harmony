<script lang="ts">
	import { tick, untrack } from "svelte";
	import { ToggleGroup } from "bits-ui";

	type ToggleGroupItem = {
		value: string;
		label: string;
		icon?: import("svelte").Component;
	};

	let {
		items = [] as ToggleGroupItem[],
		type = "single" as "single" | "multiple",
		variant = "default",
		required = false,
		class: className,
		value = $bindable<string | string[] | undefined>(),
		...restProps
	} = $props();

	let internalSingleValue = $state<string | undefined>(
		untrack(() =>
			required
				? (value as string | undefined) || items[0]?.value
				: (value as string | undefined)
		)
	);
	let internalMultipleValue = $state<string[] | undefined>(
		untrack(() =>
			required
				? (value as string[] | undefined) ||
					(items[0]?.value ? [items[0].value] : [])
				: (value as string[] | undefined)
		)
	);

	async function onSingleValueChange(newValue: string | undefined) {
		if (required && !newValue) {
			const previousValue = internalSingleValue;
			internalSingleValue = undefined;
			await tick();
			internalSingleValue = previousValue;
			return;
		}

		value = newValue;
		internalSingleValue = newValue;
	}

	async function onMultipleValueChange(newValue: string[] | undefined) {
		if (required && (!newValue || newValue.length === 0)) {
			const previousValue = internalMultipleValue;
			internalMultipleValue = undefined;
			await tick();
			internalMultipleValue = previousValue;
			return;
		}

		value = newValue;
		internalMultipleValue = newValue;
	}
</script>

{#if type === "single"}
	<ToggleGroup.Root
		type="single"
		value={internalSingleValue}
		class="bits-togglegroup {className}"
		onValueChange={onSingleValueChange}
		{...restProps}
	>
		{#each items as item}
			{@const Icon = item.icon}
			<ToggleGroup.Item value={item.value}>
				{#if Icon}
					<span data-toggle-group-item-icon><Icon /></span>
				{:else}
					{item.label}
				{/if}
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
{:else}
	<ToggleGroup.Root
		type="multiple"
		value={internalMultipleValue}
		class="bits-togglegroup {className}"
		onValueChange={onMultipleValueChange}
		{...restProps}
	>
		{#each items as item}
			{@const Icon = item.icon}
			<ToggleGroup.Item value={item.value}>
				{#if Icon}
					<span data-toggle-group-item-icon><Icon /></span>
				{:else}
					{item.label}
				{/if}
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
{/if}

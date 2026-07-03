<script lang="ts">
	import { Select, useId } from "bits-ui";
	import ChevronDown from "@lucide/svelte/icons/chevron-down";
	import Check from "@lucide/svelte/icons/check";

	type SelectItem = {
		value: string;
		label: string;
		group?: string;
	};

	let {
		id = useId(),
		value = $bindable(),
		items = [] as SelectItem[],
		placeholder = "Select an option",
		multiple = false,
		disabled = false,
		class: className,
		...restProps
	} = $props();

	const groups = $derived.by(() => {
		const groupedItems: Record<string, SelectItem[]> = {};
		items.forEach((item) => {
			const groupName = item.group || "default";
			if (!groupedItems[groupName]) groupedItems[groupName] = [];
			groupedItems[groupName].push(item);
		});
		return groupedItems;
	});

	const groupNames = $derived(Object.keys(groups));

	const selectedLabel = $derived.by(() => {
		if (multiple) {
			if (!Array.isArray(value) || value.length === 0) return placeholder;
			return value
				.map((v) => items.find((i) => i.value === v)?.label)
				.filter(Boolean)
				.join(", ");
		}
		const selected = items.find((i) => i.value === value);
		return selected ? selected.label : placeholder;
	});
</script>

<div class="bits-select {className ?? ''}">
	<Select.Root
		bind:value
		{disabled}
		type={multiple ? "multiple" : "single"}
		{...restProps}
	>
		<Select.Trigger {id}>
			<span data-select-value>{selectedLabel}</span>
			<ChevronDown data-select-icon />
		</Select.Trigger>
		<Select.Content sideOffset={4}>
			{#each groupNames as groupName}
				{#if groupName !== "default"}
					<Select.Group>
						<Select.GroupHeading>{groupName}</Select.GroupHeading>
						{#each groups[groupName] as item}
							<Select.Item value={item.value} label={item.label}>
								{item.label}
								<span data-select-item-indicator><Check /></span>
							</Select.Item>
						{/each}
					</Select.Group>
				{:else}
					{#each groups[groupName] as item}
						<Select.Item value={item.value} label={item.label}>
							{item.label}
							<span data-select-item-indicator><Check /></span>
						</Select.Item>
					{/each}
				{/if}
			{/each}
		</Select.Content>
	</Select.Root>
</div>

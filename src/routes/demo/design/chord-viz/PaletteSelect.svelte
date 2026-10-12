<script lang="ts">
	import { Select } from "bits-ui";
	import ChevronDown from "@lucide/svelte/icons/chevron-down";
	import Check from "@lucide/svelte/icons/check";
	import { CHORD_PALETTES } from "./chordPalettes.js";
	import PaletteSwatches from "./PaletteSwatches.svelte";

	type Props = {
		value: string;
		onChange: (id: string) => void;
	};

	let { value, onChange }: Props = $props();

	const items = CHORD_PALETTES.map(({ id, label }) => ({ value: id, label }));
	const selected = $derived(
		CHORD_PALETTES.find((entry) => entry.id === value) ?? CHORD_PALETTES[0]
	);
</script>

<div class="palette-select">
	<span class="title">Palette</span>
	<Select.Root type="single" {value} onValueChange={onChange} {items}>
		<Select.Trigger class="palette-select-trigger" aria-label="Palette">
			<span class="option" data-select-value>
				<PaletteSwatches palette={selected.palette} />
				{selected.label}
			</span>
			<ChevronDown data-select-icon />
		</Select.Trigger>
		<Select.Content class="palette-select-content" sideOffset={4}>
			{#each CHORD_PALETTES as entry (entry.id)}
				<Select.Item value={entry.id} label={entry.label}>
					<span class="option">
						<PaletteSwatches palette={entry.palette} />
						{entry.label}
					</span>
					<span data-select-item-indicator><Check /></span>
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>

<style>
	.palette-select {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #52525b;
	}

	:global(.palette-select-trigger),
	:global(.palette-select-content) {
		--min-width: 18rem;
	}

	.option {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #18181b;
	}
</style>

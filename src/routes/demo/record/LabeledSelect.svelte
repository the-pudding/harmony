<script lang="ts">
	type Option = { value: string; label: string };

	type Props = {
		label: string;
		options: Option[];
		value: string | undefined;
		// Shown, disabled, while nothing is picked.
		placeholder?: string;
		onSelect: (value: string) => void;
	};

	let { label, options, value, placeholder, onSelect }: Props = $props();
</script>

<label class="labeled-select">
	<span class="label">{label}</span>
	<select
		value={value ?? ""}
		onchange={(event) => onSelect(event.currentTarget.value)}
	>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>

<style>
	.labeled-select {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.label {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	select {
		padding: 0.375rem 0.625rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
	}
</style>

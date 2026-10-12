<script lang="ts" generics="T extends string">
	import type { Option } from "./floatingEffects.js";

	type Props = {
		title: string;
		options: Option<T>[];
		value: T;
		onChange: (value: T) => void;
	};

	let { title, options, value, onChange }: Props = $props();
</script>

<div class="segmented" role="group" aria-label={title}>
	<span class="title">{title}</span>
	<div class="options">
		{#each options as option (option.value)}
			<button
				type="button"
				class="option"
				aria-pressed={option.value === value}
				onclick={() => onChange(option.value)}>{option.label}</button
			>
		{/each}
	</div>
</div>

<style>
	.segmented {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.75rem;
	}

	.title {
		color: #52525b;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.option {
		padding: 0.25rem 0.5rem;
		border: 1px solid #d4d4d8;
		border-radius: 0.375rem;
		background: #ffffff;
		color: #3f3f46;
		font: inherit;
		cursor: pointer;
	}

	.option[aria-pressed="true"] {
		border-color: #18181b;
		background: #18181b;
		color: #ffffff;
	}
</style>

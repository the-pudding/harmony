<script lang="ts">
	type Props = {
		min: number;
		max: number;
		value: number;
		disabled?: boolean;
		onChange: (year: number) => void;
	};

	const { min, max, value, disabled = false, onChange }: Props = $props();

	const isShowingAll = $derived(value >= max);
</script>

<div class="year-scrubber" class:year-scrubber-disabled={disabled}>
	<span class="year-scrubber-label">through</span>
	<input
		type="range"
		{min}
		{max}
		step={1}
		{value}
		{disabled}
		aria-label="Show songs released through this year"
		oninput={(e) => onChange(parseInt(e.currentTarget.value, 10))}
	/>
	<span class="year-scrubber-value">{isShowingAll ? "all years" : value}</span>
</div>

<style>
	.year-scrubber {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.25rem 0.625rem;
	}

	.year-scrubber-disabled {
		opacity: 0.45;
	}

	.year-scrubber-label {
		font-size: 0.7rem;
		color: #a1a1aa;
	}

	input[type="range"] {
		width: 8rem;
		accent-color: rgba(99, 102, 241, 0.8);
		cursor: pointer;
	}

	input[type="range"]:disabled {
		cursor: not-allowed;
	}

	.year-scrubber-value {
		font-size: 0.55rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: rgba(165, 180, 252, 0.95);
		min-width: 3.5rem;
		text-align: right;
	}
</style>

<script lang="ts">
	type YearRange = { min: number; max: number };

	type Props = {
		min: number;
		max: number;
		rangeMin: number;
		rangeMax: number;
		disabled?: boolean;
		onChange: (range: YearRange) => void;
	};

	const { min, max, rangeMin, rangeMax, disabled = false, onChange }: Props =
		$props();

	const isShowingAll = $derived(rangeMin <= min && rangeMax >= max);

	const rangeLabel = $derived(
		isShowingAll ? "all years" : `${rangeMin}–${rangeMax}`
	);

	const setRangeMin = (nextMin: number) => {
		onChange({ min: Math.min(nextMin, rangeMax), max: rangeMax });
	};

	const setRangeMax = (nextMax: number) => {
		onChange({ min: rangeMin, max: Math.max(nextMax, rangeMin) });
	};

	const minThumbPercent = $derived(
		max === min ? 0 : ((rangeMin - min) / (max - min)) * 100
	);
	const maxThumbPercent = $derived(
		max === min ? 100 : ((rangeMax - min) / (max - min)) * 100
	);
</script>

<div class="year-scrubber" class:year-scrubber-disabled={disabled}>
	<span class="year-scrubber-label">years</span>
	<div
		class="year-scrubber-track"
		style:--range-start="{minThumbPercent}%"
		style:--range-end="{maxThumbPercent}%"
	>
		<input
			type="range"
			{min}
			{max}
			step={1}
			value={rangeMin}
			{disabled}
			class="year-scrubber-input year-scrubber-input-min"
			aria-label="Start year of visible range"
			oninput={(e) => setRangeMin(parseInt(e.currentTarget.value, 10))}
		/>
		<input
			type="range"
			{min}
			{max}
			step={1}
			value={rangeMax}
			{disabled}
			class="year-scrubber-input year-scrubber-input-max"
			aria-label="End year of visible range"
			oninput={(e) => setRangeMax(parseInt(e.currentTarget.value, 10))}
		/>
	</div>
	<span class="year-scrubber-value">{rangeLabel}</span>
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

	.year-scrubber-track {
		position: relative;
		width: 9.5rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
	}

	.year-scrubber-track::before {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		height: 0.25rem;
		border-radius: 999px;
		background: rgba(63, 63, 70, 0.9);
		pointer-events: none;
	}

	.year-scrubber-track::after {
		content: "";
		position: absolute;
		left: var(--range-start);
		right: calc(100% - var(--range-end));
		height: 0.25rem;
		border-radius: 999px;
		background: rgba(99, 102, 241, 0.8);
		pointer-events: none;
	}

	.year-scrubber-input {
		position: absolute;
		inset: 0;
		margin: 0;
		width: 100%;
		appearance: none;
		background: transparent;
		pointer-events: none;
		cursor: pointer;
	}

	.year-scrubber-input:disabled {
		cursor: not-allowed;
	}

	.year-scrubber-input::-webkit-slider-runnable-track {
		appearance: none;
		background: transparent;
		height: 0.25rem;
	}

	.year-scrubber-input::-moz-range-track {
		appearance: none;
		background: transparent;
		height: 0.25rem;
		border: none;
	}

	.year-scrubber-input::-webkit-slider-thumb {
		appearance: none;
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 999px;
		background: rgba(165, 180, 252, 0.95);
		border: 1px solid rgba(99, 102, 241, 0.9);
		pointer-events: auto;
		cursor: pointer;
		margin-top: -0.3rem;
	}

	.year-scrubber-input::-moz-range-thumb {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 999px;
		background: rgba(165, 180, 252, 0.95);
		border: 1px solid rgba(99, 102, 241, 0.9);
		pointer-events: auto;
		cursor: pointer;
	}

	.year-scrubber-input:disabled::-webkit-slider-thumb,
	.year-scrubber-input:disabled::-moz-range-thumb {
		cursor: not-allowed;
	}

	.year-scrubber-input-max {
		z-index: 2;
	}

	.year-scrubber-value {
		font-size: 0.55rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: rgba(165, 180, 252, 0.95);
		min-width: 5.5rem;
		text-align: right;
	}
</style>

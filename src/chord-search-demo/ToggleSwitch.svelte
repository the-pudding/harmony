<script lang="ts">
	const {
		checked,
		onchange,
		label
	}: {
		checked: boolean;
		onchange: (checked: boolean) => void;
		label: string;
	} = $props();
</script>

<label class="toggle">
	<input
		type="checkbox"
		{checked}
		onchange={(e) => onchange((e.currentTarget as HTMLInputElement).checked)}
	/>
	<span class="track"></span>
	<span class="thumb"></span>
	<span class="toggle-label">{label}</span>
</label>

<style>
	.toggle {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
		position: relative;
		width: fit-content;
	}

	.toggle input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.track {
		width: 2rem;
		height: 1rem;
		background: #3f3f46;
		border-radius: 9999px;
		transition: background 0.15s;
	}

	.toggle input:checked ~ .track {
		background: #4f46e5;
	}

	.thumb {
		position: absolute;
		left: 0.125rem;
		top: 0.125rem;
		width: 0.75rem;
		height: 0.75rem;
		background: #fff;
		border-radius: 9999px;
		transition: transform 0.15s;
		pointer-events: none;
	}

	.toggle input:checked ~ .thumb {
		transform: translateX(1rem);
	}

	.toggle-label {
		font-size: 0.5rem;
		color: #a1a1aa;
	}
</style>

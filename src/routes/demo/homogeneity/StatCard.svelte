<script lang="ts">
	type Props = {
		label: string;
		value: string;
		caption: string;
		accentColor?: string;
	};

	const { label, value, caption, accentColor }: Props = $props();
</script>

<div class="stat-card">
	<span class="stat-label">{label}</span>
	<span class="stat-value" style:color={accentColor}>{value}</span>
	<span class="stat-caption">{caption}</span>
</div>

<style>
	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.stat-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a1a1aa;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #f4f4f5;
	}

	.stat-caption {
		font-size: 0.7rem;
		line-height: 1.4;
		color: #71717a;
	}
</style>

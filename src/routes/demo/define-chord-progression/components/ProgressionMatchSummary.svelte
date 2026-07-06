<script lang="ts">
	type Props = {
		total: number;
		highlighted: number;
		coreCount: number;
		nonCoreCount: number;
		strictSubsetCount: number;
	};

	let { total, highlighted, coreCount, nonCoreCount, strictSubsetCount }: Props = $props();
</script>

<div class="summary">
	<span class="stat"><span class="value">{total}</span> <span class="label">total</span></span>
	<span class="sep">·</span>
	<span class="stat"><span class="value">{highlighted}</span> <span class="label">highlighted</span></span>
	<span class="sep">·</span>
	<span class="stat core"><span class="value">{coreCount}</span> <span class="label">core</span></span>
	<span class="sep">·</span>
	<span class="stat"><span class="value">{nonCoreCount}</span> <span class="label">non-core</span></span>
	<span class="sep">·</span>
	<span class="stat subset"><span class="value dashed-badge">{strictSubsetCount}</span> <span class="label">is strict subset of a progression with more coverage</span></span>
</div>

<style>
	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.375rem;
		font-size: 0.6875rem;
		color: #52525b;
		margin-bottom: 0.375rem;
	}

	.sep {
		color: #3f3f46;
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.label {
		color: #52525b;
	}

	.value {
		color: #a1a1aa;
		font-weight: 500;
	}

	.core .label {
		color: rgba(134, 239, 172, 0.6);
	}

	.core .value {
		color: rgba(134, 239, 172, 0.85);
	}

	.subset .label {
		color: #52525b;
	}

	.dashed-badge {
		outline: 1px dashed rgba(161, 161, 170, 0.5);
		outline-offset: 2px;
		border-radius: 2px;
		padding: 0 2px;
	}
</style>

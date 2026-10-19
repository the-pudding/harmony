<script lang="ts">
	import type { SyncedSongRegion } from "$data/syncedSongs.js";
	import type { RegionEdge } from "./syncedTimings.js";
	import { formatTimestamp } from "./songTime.js";

	type Props = {
		region: SyncedSongRegion;
		disabled: boolean;
		onSetEdgeToPlayhead: (edge: RegionEdge) => void;
	};

	let { region, disabled, onSetEdgeToPlayhead }: Props = $props();
</script>

<div class="region">
	<span class="heading">Region</span>
	<span class="range">
		{disabled
			? "—"
			: `${formatTimestamp(region.startSeconds)} → ${formatTimestamp(region.endSeconds)}`}
	</span>
	<button type="button" {disabled} onclick={() => onSetEdgeToPlayhead("start")}
		>start at playhead</button
	>
	<button type="button" {disabled} onclick={() => onSetEdgeToPlayhead("end")}
		>end at playhead</button
	>
</div>

<style>
	.region {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		width: fit-content;
		padding: 0.5rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.6875rem;
		color: #a1a1aa;
	}

	.heading {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.range {
		color: #fcd34d;
		font-variant-numeric: tabular-nums;
	}

	button {
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
		cursor: pointer;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>

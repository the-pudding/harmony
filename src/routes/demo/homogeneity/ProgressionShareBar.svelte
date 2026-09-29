<script lang="ts">
	import type { ProgressionShare } from "../shared/progressionHomogeneity.js";
	import { formatShareAsPercent, shareToPercent } from "./homogeneityFormat.js";

	type Props = {
		shares: ProgressionShare[];
	};

	const { shares }: Props = $props();

	const SEGMENT_COLORS = ["#e4e4e7", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"];

	const colorForIndex = (index: number): string =>
		SEGMENT_COLORS[Math.min(index, SEGMENT_COLORS.length - 1)];
</script>

<div class="share-bar">
	{#each shares as share, index (share.name)}
		<div
			class="segment"
			style:width="{shareToPercent(share.share)}%"
			style:background={colorForIndex(index)}
			title="{share.name}: {formatShareAsPercent(share.share)}"
		></div>
	{/each}
</div>

<style>
	.share-bar {
		display: flex;
		width: 10rem;
		height: 0.625rem;
		overflow: hidden;
		border-radius: 0.125rem;
		background: #18181b;
	}

	.segment {
		height: 100%;
		flex-shrink: 0;
		box-sizing: border-box;
		border-right: 1px solid #09090b;
	}

	.segment:last-child {
		border-right: none;
	}
</style>

<script module lang="ts">
	// One bar splitting a song by matched progression, with percent + name
	// labels under the colored slivers. Shared by the hex map tooltip and the
	// story's EffectiveProgressions.
	export type ProgressionShareSegment = {
		name: string;
		// Percent of the whole song, so the bar's empty tail is unmatched chords.
		percent: number;
		// Uncolored slivers fall back to gray.
		color?: string;
		// Defaults to labeling every colored sliver.
		labeled?: boolean;
	};
</script>

<script lang="ts">
	type Props = {
		segments: ProgressionShareSegment[];
		// How many rows labels can stack into before one that still doesn't
		// fit is left off.
		labelRowCount?: number;
	};

	const { segments, labelRowCount = 2 }: Props = $props();

	const UNCOLORED_PROGRESSION_COLOR = "#71717a";
	// A monospace character's width as a fraction of the font size, and the
	// space kept between labels.
	const LABEL_CHAR_WIDTH_EM = 0.6;
	const LABEL_GAP_PX = 8;

	let barWidth = $state(0);
	let labelFontSize = $state(0);

	const measureLabelFont = (node: HTMLElement) => {
		labelFontSize = parseFloat(
			getComputedStyle(node).getPropertyValue("--label-size-px")
		);
	};

	// Percent and name for the colored slivers, each centered under its
	// sliver where it fits, biggest slivers first. A label that would overlap
	// one already placed drops to the next row, or is skipped.
	const labels = $derived.by(() => {
		const rows: { left: number; right: number }[][] = Array.from(
			{ length: labelRowCount },
			() => []
		);
		const placed: {
			name: string;
			text: string;
			color: string;
			left: number;
			row: number;
		}[] = [];
		const charWidth = labelFontSize * LABEL_CHAR_WIDTH_EM;
		let start = 0;
		for (const segment of segments) {
			const center = ((start + segment.percent / 2) / 100) * barWidth;
			start += segment.percent;
			const labeled = segment.labeled ?? segment.color !== undefined;
			if (!labeled || barWidth === 0) continue;
			const text = `${Math.round(segment.percent)}% ${segment.name}`;
			const width = text.length * charWidth;
			const left = Math.min(
				Math.max(center - width / 2, 0),
				Math.max(barWidth - width, 0)
			);
			const right = left + width;
			const row = rows.findIndex((intervals) =>
				intervals.every(
					(other) =>
						right + LABEL_GAP_PX <= other.left ||
						left >= other.right + LABEL_GAP_PX
				)
			);
			if (row === -1) continue;
			rows[row].push({ left, right });
			placed.push({
				name: segment.name,
				text,
				color: segment.color ?? UNCOLORED_PROGRESSION_COLOR,
				left,
				row
			});
		}
		return placed;
	});

	const usedRowCount = $derived(
		labels.reduce((count, { row }) => Math.max(count, row + 1), 0)
	);
</script>

<div
	class="progression-share-bar"
	bind:clientWidth={barWidth}
	{@attach measureLabelFont}
>
	<div class="bar">
		{#each segments as segment (segment.name)}
			<div
				class="segment"
				style:width="{segment.percent}%"
				style:background={segment.color ?? UNCOLORED_PROGRESSION_COLOR}
			></div>
		{/each}
	</div>
	{#if usedRowCount > 0}
		<div class="labels" style:--row-count={usedRowCount}>
			{#each labels as label (label.name)}
				<span
					class="label"
					style:left="{label.left}px"
					style:--row={label.row}
					style:color={label.color}>{label.text}</span
				>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Override --label-size-px / --bar-height / --segment-gap from outside.
	   The label layout reads --label-size-px, so keep it in px. */
	.progression-share-bar {
		--label-size-px: 9.6px;
		--label-line: calc(var(--label-size-px) * 1.4);
		position: relative;
	}

	.bar {
		display: flex;
		gap: var(--segment-gap, 1px);
		height: var(--bar-height, 0.625rem);
		border-radius: 0.1875rem;
		overflow: hidden;
		background: #27272a;
	}

	.segment {
		flex-shrink: 0;
	}

	.labels {
		position: relative;
		height: calc(var(--row-count) * var(--label-line));
		margin-top: 0.25rem;
	}

	.label {
		position: absolute;
		top: calc(var(--row) * var(--label-line));
		font-size: var(--label-size-px);
		line-height: var(--label-line);
		white-space: nowrap;
	}
</style>

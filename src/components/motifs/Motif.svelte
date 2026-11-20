<script lang="ts">
	import Chord from "$components/Chord.svelte";
	import MotifLoop from "./MotifLoop.svelte";
	import MotifTimeline from "./MotifTimeline.svelte";
	import type { MotifName } from "./motifs";

	type Props = {
		name: MotifName;
		// small contexts (chapter titles): drops the tiny text labels
		compact?: boolean;
		// ms to wait before the entrance animation starts
		delay?: number;
	};

	const ROMANS = ["I", "V", "vi", "IV"];
	const NAMES = ["C", "G", "Am", "F"];

	let { name, compact = false, delay = 400 }: Props = $props();
</script>

<span class="motif {name}" class:compact aria-hidden="true">
	{#if name === "progression" || name === "progression-names"}
		<!-- styled by span.chords[data-chords] in app.css, like inline chords -->
		<span class="chords" data-chords="I-V-vi-IV">
			{#each ROMANS as roman, i}
				<Chord chord={roman} label={name === "progression-names" ? NAMES[i] : undefined} />
			{/each}
		</span>
	{:else if name === "loop"}
		<MotifLoop {compact} {delay} />
	{:else if name === "timeline"}
		<MotifTimeline {delay} />
	{/if}
</span>

<style>
	.motif {
		display: inline-block;
		vertical-align: middle;
		white-space: nowrap;
		line-height: 1;
	}
	.motif.compact {
		font-size: 0.85em;
	}
	.motif.progression.compact,
	.motif.progression-names.compact {
		font-size: 0.6em;
	}
	/* struck-through (already debunked) points */
	:global(s) .motif {
		opacity: 0.45;
	}
</style>

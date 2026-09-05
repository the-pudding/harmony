<script lang="ts">
	import type { Snippet } from "svelte";
	import V1V2SongCompare from "./V1V2SongCompare.svelte";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { MatchWeights } from "../match-algo-v2-logic/weights.js";

	type Props = {
		song: GroupedSong | null;
		weights: MatchWeights;
		align?: "start" | "end";
		children: Snippet;
	};

	const { song, weights, align = "start", children }: Props = $props();

	let hovering = $state(false);

	const showTooltip = $derived(hovering && song !== null);
</script>

<div
	class="hover-wrap"
	class:align-end={align === "end"}
	role="group"
	onmouseenter={() => (hovering = true)}
	onmouseleave={() => (hovering = false)}
>
	{@render children()}
	{#if showTooltip && song}
		<div class="tooltip" role="tooltip">
			<p class="tooltip-title">
				{song.title}
				{#if song.artists.length > 0}
					<span class="artist">{song.artists.join(", ")}</span>
				{/if}
			</p>
			<V1V2SongCompare {song} {weights} />
		</div>
	{/if}
</div>

<style>
	.hover-wrap {
		position: relative;
	}

	.tooltip {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		width: min(36rem, 80vw);
		padding: 0.75rem;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		background: #09090b;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
		z-index: 30;
		pointer-events: none;
	}

	.align-end .tooltip {
		left: auto;
		right: 0;
	}

	.tooltip-title {
		margin: 0 0 0.6rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.artist {
		font-weight: 400;
		color: #71717a;
	}
</style>

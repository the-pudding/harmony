<script lang="ts">
	// Where a slide wants a song's dot: a box the map draws the song's mark
	// over (see songDots). It draws nothing itself; clicks, focus and the
	// accessible name are its own.
	import { songDots } from "$runes/songDots.svelte";
	import {
		SONG_LABEL_LINE_HEIGHT_PX,
		SONG_LABEL_STYLE
	} from "$components/hexmap/components/songLabelText";

	type Props = {
		songKey: string;
		// tag: beside a card; title: beside a song's title; play: a big
		// play button.
		size?: "tag" | "title" | "play";
		label?: "none" | "beside";
		// The label title's font size.
		labelPx?: number;
		align?: "start" | "center";
		// Without it, the dot is inert.
		onclick?: () => void;
		playing?: boolean;
		// 0 to 1 through the playing clip.
		progress?: number;
		travelDelayMs?: number;
	};

	const {
		songKey,
		size = "title",
		label = "none",
		labelPx = SONG_LABEL_STYLE.title.fontSizePx,
		align = "start",
		onclick,
		playing = false,
		progress = 0,
		travelDelayMs = 0
	}: Props = $props();

	const RADIUS = { tag: 7, title: 10, play: 26 };
	// The label's title and the "Artist (year)" line beneath it.
	const LABEL_LINES = 2;

	const radius = $derived(RADIUS[size]);
	const height = $derived(
		label === "beside"
			? Math.max(
					2 * radius,
					(LABEL_LINES * SONG_LABEL_LINE_HEIGHT_PX * labelPx) /
						SONG_LABEL_STYLE.title.fontSizePx
				)
			: 2 * radius
	);

	const summary = $derived(songDots.summaryOf(songKey));
	const name = $derived(
		summary ? `${summary.title} by ${summary.artists.join(", ")}` : songKey
	);

	// Read by the map on every frame it draws the mark, not reactive.
	let hovered = false;

	// The nearest ancestor that scrolls, which clips the mark.
	const scrollParentOf = (el: HTMLElement): HTMLElement | null => {
		for (let parent = el.parentElement; parent; parent = parent.parentElement) {
			if (getComputedStyle(parent).overflowY !== "visible") return parent;
		}
		return null;
	};

	const anchor = (el: HTMLElement) =>
		songDots.register({
			songKey,
			el,
			clipEl: scrollParentOf(el),
			get radius() {
				return radius;
			},
			get label() {
				return label;
			},
			get labelPx() {
				return labelPx;
			},
			get align() {
				return align;
			},
			get playable() {
				return onclick !== undefined;
			},
			get playing() {
				return playing;
			},
			get progress() {
				return progress;
			},
			get hovered() {
				return hovered;
			},
			get travelDelayMs() {
				return travelDelayMs;
			}
		});
</script>

{#if onclick}
	<button
		class="song-anchor"
		style:width={label === "beside" ? "100%" : `${2 * radius}px`}
		style:height="{height}px"
		aria-label="Play {name}"
		aria-pressed={playing}
		{onclick}
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => (hovered = false)}
		{@attach anchor}
	></button>
{:else}
	<span
		class="song-anchor"
		style:width={label === "beside" ? "100%" : `${2 * radius}px`}
		style:height="{height}px"
		role="img"
		aria-label={name}
		{@attach anchor}
	></span>
{/if}

<style>
	.song-anchor {
		display: block;
		flex: none;
		max-width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		box-shadow: none;
	}

	button.song-anchor {
		cursor: pointer;
	}

	button.song-anchor:hover {
		background: none;
	}

	button.song-anchor:focus-visible {
		outline: 2px solid var(--color-fg);
		outline-offset: 4px;
	}
</style>

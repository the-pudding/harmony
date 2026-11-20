import { untrack } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import type { SongSummary } from "$components/hexmap/components/scatter/paint/outlinedLabels.js";

// Where a slide wants a song's mark: the map draws the song's dot (and
// label) over this element's box instead of at its map position. Read on
// every frame the mark is drawn, so a registrant can expose live values
// through getters.
export type DotAnchor = {
	songKey: string;
	el: HTMLElement;
	// Content outside this element's box is scrolled out of view, so the
	// mark is clipped to it (null: nothing clips it).
	clipEl: HTMLElement | null;
	radius: number;
	label: "none" | "beside";
	// The title's font size; the line beneath scales with it.
	labelPx: number;
	// Where the dot (and its label) sit in the box.
	align: "start" | "center";
	playable: boolean;
	playing: boolean;
	// 0 to 1 through the playing clip.
	progress: number;
	hovered: boolean;
};

// Per song, every registered anchor, newest last: an outgoing slide's
// anchor can still be registered while the incoming one takes over.
const stacks = new Map<string, DotAnchor[]>();
const active = new SvelteMap<string, DotAnchor>();
// Songs whose mark hasn't reached its anchor yet.
const travelling = new SvelteSet<string>();
// Maps drawing the marks; without one, no mark can travel.
let painters = $state(0);
let summaries = $state.raw<ReadonlyMap<string, SongSummary>>(new Map());

const activate = (songKey: string) => {
	const top = stacks.get(songKey)?.at(-1);
	if (top) {
		active.set(songKey, top);
	} else {
		active.delete(songKey);
		travelling.delete(songKey);
	}
};

export const songDots = {
	// The anchor each song's mark goes to (the newest registered).
	get anchors(): ReadonlyMap<string, DotAnchor> {
		return active;
	},

	// Returns the unregister function.
	register(anchor: DotAnchor): () => void {
		const { songKey } = anchor;
		const stack = stacks.get(songKey) ?? [];
		stacks.set(songKey, [...stack, anchor]);
		travelling.add(songKey);
		activate(songKey);
		return () => {
			const remaining = (stacks.get(songKey) ?? []).filter(
				(registered) => registered !== anchor
			);
			if (remaining.length > 0) stacks.set(songKey, remaining);
			else stacks.delete(songKey);
			activate(songKey);
		};
	},

	// True once every anchored song's mark has reached its anchor, or when
	// no map is drawing them.
	get arrived(): boolean {
		return painters === 0 || travelling.size === 0;
	},

	// Called by a map that draws the marks; returns the disconnect function.
	connectPainter(): () => void {
		untrack(() => painters++);
		return () => untrack(() => painters--);
	},

	// Called by the map when a song's mark reaches its anchor.
	settle(songKey: string) {
		travelling.delete(songKey);
	},

	// Titles and artists, set by the map once it has loaded.
	summaryOf(songKey: string): SongSummary | undefined {
		return summaries.get(songKey);
	},
	set summaries(bySongKey: ReadonlyMap<string, SongSummary>) {
		summaries = bySongKey;
	}
};

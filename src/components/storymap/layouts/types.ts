import type { SongTable } from "../songTable.js";

// CSS px of the rect a framed layout fills (see frameRect in viewport.ts).
export type LayoutFrame = { width: number; height: number };

export type LayoutContext = { songs: SongTable; frame: LayoutFrame };

// Under the songs (the default), or over their dots but still under song
// marks and labels; text over the dots is haloed so it reads against them. Guides are painted, so they never catch the
// pointer.
export type GuideLayer = "under" | "over";

// Axis labels, ticks, labels and boxes drawn with a layout. Positions are
// 0–1 across the frame, y up.
export type Guide =
	| {
			kind: "axisLabel";
			text: string;
			at: "bottom-right" | "bottom-left" | "left-top";
	  }
	| { kind: "tick"; text: string; x: number }
	// Centered vertically on y; muted gray unless given a color. Going to
	// another layout, a label moves to the one there with the same id
	// instead of fading out while it fades in.
	| {
			kind: "label";
			id?: string;
			text: string;
			x: number;
			y: number;
			align: "left" | "center" | "right";
			color?: string;
			weight?: "regular" | "bold";
			size?: "regular" | "medium" | "large" | "xlarge";
			layer?: GuideLayer;
	  }
	// An outline (the default) or a faint shade; (x, y) is its bottom-left
	// corner. Like a label, it moves to the next layout's box with its id.
	| {
			kind: "box";
			id?: string;
			style?: "outline" | "shade";
			x: number;
			y: number;
			width: number;
			height: number;
			layer?: GuideLayer;
	  }
	// A smooth line through points (y up), over the songs unless layered
	// under. It morphs into the next layout's line with its id when both
	// have as many points.
	| {
			kind: "line";
			id?: string;
			points: readonly { x: number; y: number }[];
			color: string;
			layer?: GuideLayer;
	  };

export type LayoutResult = {
	name: string;
	// 0–1 within the frame (framed) or the whole plot, by song index. NaN =
	// not placed.
	x: Float32Array;
	y: Float32Array;
	// Placed inside the map's frame rather than across the whole plot.
	framed: boolean;
	// "hex" bins into hexes when zoomed out; "none" draws dots.
	aggregate: "hex" | "none";
	color: "star" | "region";
	// Per song, a color drawn instead of star white (null keeps it white).
	fill?: readonly (string | null)[];
	// Dot radius at 1×, in screen px.
	pointRadius: number;
	guides: readonly Guide[];
	// Per-song transition stagger (0–1).
	stagger?: Float32Array;
};

export type Layout<Params> = {
	name: string;
	// Depends on the frame's size.
	framed: boolean;
	compute: (context: LayoutContext, params: Params) => LayoutResult;
};

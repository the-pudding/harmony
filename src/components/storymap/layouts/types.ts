import type { SongTable } from "../songTable.js";

// CSS px of the rect a framed layout fills (see frameRect in viewport.ts).
export type LayoutFrame = { width: number; height: number };

export type LayoutContext = { songs: SongTable; frame: LayoutFrame };

// Under the songs (the default), or over them; text over them is haloed so
// it reads against the dots. Guides are painted, so they never catch the
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
	// An outline; (x, y) is its bottom-left corner.
	| {
			kind: "box";
			x: number;
			y: number;
			width: number;
			height: number;
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

import type { SongTable } from "../songTable.js";

// CSS px of the rect a framed layout fills (see frameRect in viewport.ts).
export type LayoutFrame = { width: number; height: number };

export type LayoutContext = { songs: SongTable; frame: LayoutFrame };

// Axis labels, ticks and column labels drawn with a layout.
export type Guide =
	| {
			kind: "axisLabel";
			text: string;
			at: "bottom-right" | "bottom-left" | "left-top";
	  }
	| { kind: "tick"; text: string; x: number }
	| { kind: "columnLabel"; text: string; x: number; y: number };

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

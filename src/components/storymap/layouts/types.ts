import type { SongTable } from "../songTable.js";

// CSS px of the rect a layout fills.
export type LayoutFrame = { width: number; height: number };

export type LayoutContext = { songs: SongTable; frame: LayoutFrame };

// Things drawn with a layout (axis labels, ticks, column labels); they fade
// in and out with it. None exist yet; later layouts add them.
export type Guide =
	| {
			kind: "axisLabel";
			text: string;
			at: "bottom-right" | "bottom-left" | "left-top";
	  }
	| { kind: "tick"; text: string; x: number }
	| { kind: "columnLabel"; text: string; x: number; y: number };

export type LayoutResult = {
	// 0–1 within the frame, by song index; NaN = this layout doesn't place
	// the song (it fades out where it is).
	x: Float32Array;
	y: Float32Array;
	// "hex": bin into hexes when zoomed out (UMAP only). "none": dots.
	aggregate: "hex" | "none";
	// How dots are filled: plain stars, or by region/cluster as the hex map does.
	color: "star" | "region";
	// Dot radius at 1×, in screen px.
	pointRadius: number;
	guides: readonly Guide[];
	// Optional per-song stagger (0–1) for transitions into this layout.
	stagger?: Float32Array;
};

export type Layout<Params> = {
	name: string;
	compute: (context: LayoutContext, params: Params) => LayoutResult;
};

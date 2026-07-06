import type { Writable } from "svelte/store";

export type LayerCakeConfig = Record<string, string> & {
	z?: string;
	x?: string[];
};

export type LayerCakePadding = {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
};

export type LayerCakeRows = Record<string, unknown>[];

export type LayerCakeTicks =
	| number
	| number[]
	| ((values: number[]) => number[])
	| undefined;

export type D3ScaleLike = {
	(value: number | string): number;
	ticks: (count?: number) => number[];
	bandwidth?: () => number;
	range: () => number[];
};

export type LayerCakeContext = {
	data: Writable<LayerCakeRows>;
	xGet: Writable<(d: unknown) => number>;
	yGet: Writable<(d: unknown) => number>;
	zGet: Writable<(d: unknown) => unknown>;
	zScale: Writable<(d: unknown) => string>;
	rGet?: Writable<(d: unknown) => number>;
	xScale: Writable<D3ScaleLike>;
	yScale: Writable<D3ScaleLike>;
	width: Writable<number>;
	height: Writable<number>;
	xRange?: Writable<number[]>;
	yRange?: Writable<[number, number]>;
	config: Writable<LayerCakeConfig>;
	padding: Writable<LayerCakePadding>;
};

export type CanvasContext = {
	ctx: CanvasRenderingContext2D;
};

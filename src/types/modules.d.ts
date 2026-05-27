declare module "layercake" {
	import type { Component } from "svelte";
	export const LayerCake: Component;
	export const Svg: Component;
	export const Html: Component;
	export const Canvas: Component;
	export function raise(node: Element): void;
	export function scaleCanvas(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): CanvasRenderingContext2D;
	export function uniques<T>(
		values: T[],
		accessor: (value: T) => string,
		sort?: boolean
	): T[];
}

declare module "*.csv" {
	const rows: Record<string, string>[];
	export default rows;
}

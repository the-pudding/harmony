import {
	screenProjection,
	screenX,
	screenY,
	type ScreenProjection
} from "../viewport.js";
import type { HexThemeColors, Point2D, Viewport } from "../types.js";

// Everything a painter needs for one frame; per-song arrays are by song index.
export type Scene = {
	context: CanvasRenderingContext2D;
	viewport: Viewport;
	// 0–1 across the plot, by song index.
	x: Float32Array;
	y: Float32Array;
	// 0 (hidden: not drawn or hit-tested) to 1, by song index.
	alpha: Float32Array;
	indexOf: ReadonlyMap<string, number>;
	projection: ScreenProjection;
	themeColors: HexThemeColors;
};

export const createScene = (fields: Omit<Scene, "projection">): Scene => ({
	...fields,
	projection: screenProjection(fields.viewport)
});

// A song's index if it's drawn (alpha above 0), else -1.
export const drawnIndexOf = (scene: Scene, songKey: string): number => {
	const index = scene.indexOf.get(songKey);
	return index === undefined || !(scene.alpha[index] > 0) ? -1 : index;
};

export const screenOfIndex = (scene: Scene, index: number): Point2D => ({
	x: screenX(scene.projection, scene.x[index]),
	y: screenY(scene.projection, scene.y[index])
});

// A song's current screen position, or null when it isn't drawn.
export const songScreen = (scene: Scene, songKey: string): Point2D | null => {
	const index = drawnIndexOf(scene, songKey);
	return index === -1 ? null : screenOfIndex(scene, index);
};

// Sizes the canvas's backing store for the pixel ratio, clears it, and
// returns a context drawing in CSS pixels. Null when there's nothing to
// draw into yet.
export const prepareCanvas = (
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	pixelRatio: number
): CanvasRenderingContext2D | null => {
	const context = canvas.getContext("2d");
	if (!context || width === 0 || height === 0) return null;
	const pixelWidth = Math.round(width * pixelRatio);
	const pixelHeight = Math.round(height * pixelRatio);
	if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
	if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
	context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	context.clearRect(0, 0, width, height);
	return context;
};

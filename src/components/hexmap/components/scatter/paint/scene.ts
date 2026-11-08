import { toScreen } from "../viewport.js";
import type { HexThemeColors, Point2D, Position, Viewport } from "../types.js";

// What every painter needs for one frame: where to draw, how the view is
// zoomed, where each song currently sits (mid-tween included), and the
// theme's colors.
export type Scene = {
	context: CanvasRenderingContext2D;
	viewport: Viewport;
	positions: ReadonlyMap<string, Position>;
	themeColors: HexThemeColors;
};

// A song's current screen position, or null when it has none yet.
export const songScreen = (scene: Scene, songKey: string): Point2D | null => {
	const position = scene.positions.get(songKey);
	return position ? toScreen(scene.viewport, position) : null;
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

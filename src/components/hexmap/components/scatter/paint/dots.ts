import {
	RING_WIDTH,
	SELECTED_POINT_RADIUS,
	STAR_FILL_COLOR
} from "../constants.js";
import type { PointStyle } from "../pointStyle.js";
import { screenX, screenY } from "../viewport.js";
import { songScreen, type Scene } from "./scene.js";

export type DotFill = (songKey: string) => string;

// A plain dot's fill, in priority order: the emphasis color for an
// emphasized song, its region color in hex mode, the accent color for an
// accented song, then a plain star white.
export const createDotFill = ({
	emphasisFillColor,
	emphasizedSongKeys,
	regionFill,
	accentFillColor,
	isAccented
}: {
	emphasisFillColor: string | null;
	emphasizedSongKeys: Set<string> | null;
	// Set in hex mode: the song's region color at the current zoom.
	regionFill: ((songKey: string) => string) | null;
	accentFillColor: string | null;
	isAccented: (songKey: string) => boolean;
}): DotFill => {
	return (songKey) => {
		if (emphasisFillColor && emphasizedSongKeys?.has(songKey)) {
			return emphasisFillColor;
		}
		if (regionFill) return regionFill(songKey);
		if (accentFillColor && isAccented(songKey)) return accentFillColor;
		return STAR_FILL_COLOR;
	};
};

// Dots sharing a fill, alpha step and radius, drawn with one fill() call.
type DotBatch = {
	fill: string;
	// The first dot's alpha; the rest round to the same 1/ALPHA_STEPS step.
	alpha: number;
	radius: number;
	// Screen x, y pairs.
	centers: number[];
};

// Alphas this close (1/32) share a batch.
export const ALPHA_STEPS = 32;

// Radii are only told apart to 1/16px when batching (drawn exactly).
const RADIUS_KEY_STEPS = 16;

// Every drawn, on-screen song that isn't drawn as a marker. Each layer (song
// indexes) is drawn over the one before; within a layer, dots are batched
// by fill, alpha (in ALPHA_STEPS) and radius, each batch one path and one
// fill() instead of one per dot. Returns how many dots it drew.
export const drawDots = (
	scene: Scene,
	{
		layers,
		songKeys,
		style,
		fill
	}: {
		layers: readonly Int32Array[];
		songKeys: readonly string[];
		style: PointStyle;
		fill: DotFill;
	}
): number => {
	const { context, viewport, projection, x, y, alpha } = scene;
	const reach = SELECTED_POINT_RADIUS + RING_WIDTH * 3;
	const right = viewport.width + reach;
	const bottom = viewport.height + reach;
	let drawn = 0;
	for (const layer of layers) {
		// fill → (radius and alpha step) → batch, in first-seen order.
		const batches = new Map<string, Map<number, DotBatch>>();
		for (const index of layer) {
			const songAlpha = alpha[index];
			if (!(songAlpha > 0)) continue;
			const songKey = songKeys[index];
			if (style.isMarked(songKey)) continue;
			const sx = screenX(projection, x[index]);
			const sy = screenY(projection, y[index]);
			if (sx < -reach || sy < -reach || sx > right || sy > bottom) continue;
			const dotAlpha = style.alphaFor(songKey) * songAlpha;
			const radius = style.radiusFor(songKey);
			const dotFill = fill(songKey);
			const key =
				Math.round(radius * RADIUS_KEY_STEPS) * (ALPHA_STEPS + 1) +
				Math.round(dotAlpha * ALPHA_STEPS);
			let byKey = batches.get(dotFill);
			if (!byKey) {
				byKey = new Map();
				batches.set(dotFill, byKey);
			}
			let batch = byKey.get(key);
			if (!batch) {
				batch = { fill: dotFill, alpha: dotAlpha, radius, centers: [] };
				byKey.set(key, batch);
			}
			batch.centers.push(sx, sy);
			drawn++;
		}
		for (const byKey of batches.values()) {
			for (const batch of byKey.values()) fillBatch(context, batch);
		}
	}
	return drawn;
};

const fillBatch = (
	context: CanvasRenderingContext2D,
	{ fill, alpha, radius, centers }: DotBatch
) => {
	context.globalAlpha = alpha;
	context.fillStyle = fill;
	context.beginPath();
	for (let i = 0; i < centers.length; i += 2) {
		// Each arc starts at its rightmost point, so no line joins it to the
		// previous one.
		context.moveTo(centers[i] + radius, centers[i + 1]);
		context.arc(centers[i], centers[i + 1], radius, 0, Math.PI * 2);
	}
	context.fill();
};

// A thin ring around each of these songs (the selected and hovered ones).
export const drawSelectionRings = (
	scene: Scene,
	songKeys: readonly string[],
	style: PointStyle
) => {
	const { context } = scene;
	for (const songKey of songKeys) {
		const screen = songScreen(scene, songKey);
		if (!screen) continue;
		context.globalAlpha = 1;
		context.strokeStyle = "#f4f4f5";
		context.lineWidth = RING_WIDTH;
		context.beginPath();
		context.arc(
			screen.x,
			screen.y,
			style.radiusFor(songKey) + RING_WIDTH * 2,
			0,
			Math.PI * 2
		);
		context.stroke();
	}
};

import {
	COLOR_MIX_STEPS,
	RING_WIDTH,
	SELECTED_POINT_RADIUS
} from "../constants.js";
import { mixStep, STAR_FILL } from "../colorMix.js";
import type { PointStyle } from "../pointStyle.js";
import { screenX, screenY } from "../viewport.js";
import { songScreen, type Scene } from "./scene.js";

export type DotFill = (songKey: string, index: number) => string;

// A plain dot's fill: emphasis color, else the star-to-region mix, else
// accent color, else the layout's fill for it, else star white.
export const createDotFill = ({
	emphasisFillColor,
	emphasizedSongKeys,
	mix,
	regionFill,
	mixFill,
	accentFillColor,
	isAccented,
	starFill = null
}: {
	emphasisFillColor: string | null;
	emphasizedSongKeys: Set<string> | null;
	// 0 = star white, 1 = region color, by song index.
	mix: Float32Array;
	regionFill: (songKey: string) => string;
	mixFill: (songKey: string, step: number) => string;
	accentFillColor: string | null;
	isAccented: (songKey: string) => boolean;
	// By song index (see LayoutResult.fill).
	starFill?: readonly (string | null)[] | null;
}): DotFill => {
	return (songKey, index) => {
		if (emphasisFillColor && emphasizedSongKeys?.has(songKey)) {
			return emphasisFillColor;
		}
		const step = mixStep(mix[index]);
		if (step === COLOR_MIX_STEPS) return regionFill(songKey);
		if (step > 0) return mixFill(songKey, step);
		if (accentFillColor && isAccented(songKey)) return accentFillColor;
		return starFill?.[index] ?? STAR_FILL;
	};
};

type DotBatch = {
	fill: string;
	alpha: number;
	radius: number;
	// Screen x, y pairs.
	centers: number[];
};

// Dots whose alphas round to the same 1/ALPHA_STEPS share a batch.
export const ALPHA_STEPS = 32;

// Radii within 1/RADIUS_KEY_STEPS px share a batch.
const RADIUS_KEY_STEPS = 16;

// Draws on-screen, unmarked, unpinned songs layer by layer, one fill() per batch of
// same-fill/alpha/radius dots. Returns how many dots it drew.
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
		const batches = new Map<string, Map<number, DotBatch>>();
		for (const index of layer) {
			const songAlpha = alpha[index];
			if (!(songAlpha > 0)) continue;
			const songKey = songKeys[index];
			if (style.isMarked(songKey) || style.isPinned(songKey)) continue;
			const sx = screenX(projection, x[index]);
			const sy = screenY(projection, y[index]);
			if (sx < -reach || sy < -reach || sx > right || sy > bottom) continue;
			const dotAlpha = style.alphaFor(songKey) * songAlpha;
			const radius = style.radiusFor(songKey);
			const dotFill = fill(songKey, index);
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

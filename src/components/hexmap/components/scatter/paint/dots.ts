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

// Every drawn, on-screen song that isn't drawn as a marker, in order (song
// indexes). Returns how many dots it drew.
export const drawDots = (
	scene: Scene,
	{
		order,
		songKeys,
		style,
		fill
	}: {
		order: Int32Array;
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
	for (const index of order) {
		const songAlpha = alpha[index];
		if (!(songAlpha > 0)) continue;
		const songKey = songKeys[index];
		if (style.isMarked(songKey)) continue;
		const sx = screenX(projection, x[index]);
		const sy = screenY(projection, y[index]);
		if (sx < -reach || sy < -reach || sx > right || sy > bottom) continue;
		context.globalAlpha = style.alphaFor(songKey) * songAlpha;
		context.fillStyle = fill(songKey);
		context.beginPath();
		context.arc(sx, sy, style.radiusFor(songKey), 0, Math.PI * 2);
		context.fill();
		drawn++;
	}
	return drawn;
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

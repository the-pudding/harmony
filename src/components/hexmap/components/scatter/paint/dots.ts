import type { MapColorMode } from "../../../colorMode.js";
import { fillStyleForGroupShares } from "../../groupColorBlend.js";
import type { ScatterPoint } from "../../scatterPoint.js";
import {
	RING_WIDTH,
	SELECTED_POINT_RADIUS,
	STAR_FILL_COLOR
} from "../constants.js";
import type { PointStyle } from "../pointStyle.js";
import type { Point2D } from "../types.js";
import { isOnScreen } from "../viewport.js";
import { songScreen, type Scene } from "./scene.js";

export type DotFill = (
	context: CanvasRenderingContext2D,
	point: ScatterPoint,
	screen: Point2D
) => string | CanvasGradient;

// A plain dot's fill, in priority order: the emphasis color for an
// emphasized song, its region color in hex mode, the accent color for an
// accented song, then the colorMode's fill.
export const createDotFill = ({
	colorMode,
	emphasisFillColor,
	emphasizedSongKeys,
	regionFill,
	accentFillColor,
	isAccented
}: {
	colorMode: MapColorMode;
	emphasisFillColor: string | null;
	emphasizedSongKeys: Set<string> | null;
	// Set in hex mode: the song's region color at the current zoom.
	regionFill: ((songKey: string) => string) | null;
	accentFillColor: string | null;
	isAccented: (songKey: string) => boolean;
}): DotFill => {
	const baseFill: DotFill = (context, point, screen) => {
		if (colorMode === "groups") {
			return fillStyleForGroupShares(
				context,
				screen.x,
				screen.y,
				point.groupShares
			);
		}
		if (colorMode === "homogeneity") return point.homogeneityColor;
		return STAR_FILL_COLOR;
	};
	return (context, point, screen) => {
		if (emphasisFillColor && emphasizedSongKeys?.has(point.songKey)) {
			return emphasisFillColor;
		}
		if (regionFill) return regionFill(point.songKey);
		if (accentFillColor && isAccented(point.songKey)) return accentFillColor;
		return baseFill(context, point, screen);
	};
};

// Every on-screen song that isn't drawn as a marker.
export const drawDots = (
	scene: Scene,
	{
		points,
		style,
		fill
	}: { points: readonly ScatterPoint[]; style: PointStyle; fill: DotFill }
) => {
	const { context, viewport } = scene;
	const reach = SELECTED_POINT_RADIUS + RING_WIDTH * 3;
	for (const point of points) {
		if (style.isMarked(point.songKey)) continue;
		const screen = songScreen(scene, point.songKey);
		if (!screen || !isOnScreen(viewport, screen, reach)) continue;
		context.globalAlpha = style.alphaFor(point.songKey);
		context.fillStyle = fill(context, point, screen);
		context.beginPath();
		context.arc(
			screen.x,
			screen.y,
			style.radiusFor(point.songKey),
			0,
			Math.PI * 2
		);
		context.fill();
	}
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

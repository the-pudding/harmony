import {
	gradientStrengthForZoom,
	type ClusterRegion
} from "../../../embedding/layout/hexBins.js";
import {
	paintWatercolor,
	WATERCOLOR_REACH,
	type WatercolorCell
} from "../../../embedding/layout/watercolorWash.js";
import { paintHexWatercolor } from "../../../embedding/layout/hexWatercolorWash.js";
import {
	HEX_MIN_SHARE_FADE,
	HEX_OVERLAP_PX,
	HEX_ZOOM,
	HOVERED_CLUSTER_STROKE_COLOR,
	HOVERED_CLUSTER_STROKE_WIDTH
} from "../constants.js";
import type { RegionFills } from "../regionColors.js";
import { isOnScreen } from "../viewport.js";
import { traceGroupOutline, traceHex } from "./hexGeometry.js";
import type { HexLayout } from "./hexLayout.js";
import type { Scene } from "./scene.js";

type BinCell = WatercolorCell & { songKeys: readonly string[] };

export type HexPaintMode = "hex" | "watercolor" | "hex-watercolor";

// The binned map: each on-screen bin filled with its region's color (gray
// when no cluster holds it), painted as hexes or a watercolor wash, then a
// ring around the bin holding the selected song and an outline around the
// hovered cluster.
export const drawHexes = (
	scene: Scene,
	{
		layout,
		mode,
		regionFill,
		selectedSongKey,
		hoveredRegionId,
		watercolorLayer
	}: {
		layout: HexLayout;
		mode: HexPaintMode;
		regionFill: RegionFills["regionFill"];
		selectedSongKey: string | null;
		hoveredRegionId: string | null;
		// An offscreen canvas the watercolor modes paint through.
		watercolorLayer: () => HTMLCanvasElement;
	}
) => {
	const { context, viewport, themeColors } = scene;
	const { transform } = viewport;
	const screenRadius = layout.radius * transform.k;
	const gradient = gradientStrengthForZoom(
		transform.k,
		HEX_ZOOM,
		HEX_MIN_SHARE_FADE
	);
	const cullMargin =
		screenRadius * (mode === "watercolor" ? WATERCOLOR_REACH : 1);
	const traceCell = (ctx: CanvasRenderingContext2D, x: number, y: number) =>
		traceHex(ctx, x, y, screenRadius + HEX_OVERLAP_PX);
	context.globalAlpha = 1;

	const cells: BinCell[] = [];
	for (const { key, bin, region, share } of layout.orderedBins) {
		const x = transform.applyX(bin.x);
		const y = transform.applyY(bin.y);
		if (!isOnScreen(viewport, { x, y }, cullMargin)) continue;
		cells.push({
			key,
			songKeys: bin.songKeys,
			x,
			y,
			fill:
				region === null
					? themeColors.ambiguous
					: regionFill(region.name, share, gradient)
		});
	}

	if (mode === "watercolor") {
		paintWatercolor(context, watercolorLayer(), cells, screenRadius);
	} else if (mode === "hex-watercolor") {
		paintHexWatercolor(
			context,
			watercolorLayer(),
			cells,
			screenRadius,
			traceCell
		);
	} else {
		for (const cell of cells) {
			traceCell(context, cell.x, cell.y);
			context.fillStyle = cell.fill;
			context.fill();
		}
	}

	if (selectedSongKey !== null) {
		for (const cell of cells) {
			if (!cell.songKeys.includes(selectedSongKey)) continue;
			if (mode === "watercolor") {
				context.beginPath();
				context.arc(cell.x, cell.y, screenRadius, 0, Math.PI * 2);
			} else {
				traceCell(context, cell.x, cell.y);
			}
			context.strokeStyle = "#f4f4f5";
			context.lineWidth = 2;
			context.stroke();
		}
	}

	if (hoveredRegionId !== null) {
		drawRegionOutline(scene, layout, hoveredRegionId, screenRadius);
	}
};

// Strokes the outer edge of every hex in one cluster.
const drawRegionOutline = (
	{ context, viewport: { transform } }: Scene,
	{ bins, regionByKey }: HexLayout,
	regionId: ClusterRegion["id"],
	screenRadius: number
) => {
	context.beginPath();
	traceGroupOutline(
		context,
		bins,
		(key) => regionByKey.get(key)?.id === regionId,
		(bin) => [transform.applyX(bin.x), transform.applyY(bin.y)],
		screenRadius + HEX_OVERLAP_PX
	);
	context.globalAlpha = 1;
	context.strokeStyle = HOVERED_CLUSTER_STROKE_COLOR;
	context.lineWidth = HOVERED_CLUSTER_STROKE_WIDTH;
	context.lineCap = "round";
	context.stroke();
	context.lineCap = "butt";
};

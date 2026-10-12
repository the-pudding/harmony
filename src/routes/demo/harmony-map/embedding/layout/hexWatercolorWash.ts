// Watercolor-style hex fill for the 2D map's hex-binned mode.
// Preserves the hex grid shape but paints each bin with pigment-like texture:
// a flat color base, edge-pooling strokes that darken borders, a fractal
// noise granulation mask, and a soft outer blur.

import { renderNoiseTile } from "./noiseHelpers.js";
import type { WatercolorCell } from "./watercolorWash.js";

// Opacity of the flat hex fill pass.
const BASE_ALPHA = 0.88;

// Opacity of the inward edge-darkening stroke.
const EDGE_ALPHA = 0.18;

// Edge stroke width as a multiple of cell radius (extends inward from boundary).
const EDGE_WIDTH_RATIO = 0.7;

// Outer blur radius as a multiple of the cell's screen radius (in device pixels).
const BLUR_RATIO = 0.1;

// Noise tile parameters matching the SVG watercolor defaults.
const NOISE_FREQUENCY = 0.035;
const NOISE_OCTAVES = 4;
const NOISE_TILE_SIZE = 512;

// Callback type used to trace a hex path at (x, y) into a canvas context.
// The caller binds cell radius and overlap so this module stays geometry-agnostic.
export type TraceCell = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number
) => void;

let cachedNoiseTile: HTMLCanvasElement | null = null;

const noiseTile = (): HTMLCanvasElement => {
	if (cachedNoiseTile) return cachedNoiseTile;
	cachedNoiseTile = document.createElement("canvas");
	cachedNoiseTile.width = NOISE_TILE_SIZE;
	cachedNoiseTile.height = NOISE_TILE_SIZE;
	const ctx = cachedNoiseTile.getContext("2d");
	if (ctx) {
		ctx.putImageData(
			renderNoiseTile(NOISE_TILE_SIZE, NOISE_FREQUENCY, NOISE_OCTAVES),
			0,
			0
		);
	}
	return cachedNoiseTile;
};

const matchLayerSize = (
	layer: HTMLCanvasElement,
	target: HTMLCanvasElement
): void => {
	if (layer.width !== target.width) layer.width = target.width;
	if (layer.height !== target.height) layer.height = target.height;
};

// Paints hex cells with a watercolor-like texture onto `context`, using
// `layer` as scratch space. `traceCell` traces a single hex path given its
// center (x, y) in the context's current coordinate space.
export const paintHexWatercolor = (
	context: CanvasRenderingContext2D,
	layer: HTMLCanvasElement,
	cells: readonly WatercolorCell[],
	cellRadius: number,
	traceCell: TraceCell
): void => {
	const layerCtx = layer.getContext("2d");
	if (!layerCtx) return;
	matchLayerSize(layer, context.canvas);

	const transform = context.getTransform();
	const devicePixelsPerUnit = Math.hypot(transform.a, transform.b);

	layerCtx.resetTransform();
	layerCtx.clearRect(0, 0, layer.width, layer.height);
	layerCtx.setTransform(transform);

	// Pass 1: flat hex fills at base opacity.
	layerCtx.globalCompositeOperation = "source-over";
	layerCtx.globalAlpha = BASE_ALPHA;
	for (const cell of cells) {
		traceCell(layerCtx, cell.x, cell.y);
		layerCtx.fillStyle = cell.fill;
		layerCtx.fill();
	}

	// Pass 2: edge pooling — semi-transparent black stroke, clipped so it only
	// falls inside the hex union, darkening borders like pooled pigment.
	layerCtx.save();
	layerCtx.beginPath();
	for (const cell of cells) {
		traceCell(layerCtx, cell.x, cell.y);
	}
	layerCtx.clip();
	layerCtx.globalAlpha = EDGE_ALPHA;
	layerCtx.strokeStyle = "black";
	layerCtx.lineWidth = cellRadius * EDGE_WIDTH_RATIO;
	for (const cell of cells) {
		traceCell(layerCtx, cell.x, cell.y);
		layerCtx.stroke();
	}
	layerCtx.restore();

	// Pass 3: granulation mask — apply the noise tile with destination-in so
	// that low-alpha noise pixels partially erase the hex fills, creating a
	// mottled, uneven pigment surface that mirrors the SVG NOISE_ALPHA_MATRIX.
	layerCtx.resetTransform();
	const noisePattern = layerCtx.createPattern(noiseTile(), "repeat");
	if (noisePattern) {
		layerCtx.globalCompositeOperation = "destination-in";
		layerCtx.globalAlpha = 1;
		layerCtx.fillStyle = noisePattern;
		layerCtx.fillRect(0, 0, layer.width, layer.height);
	}

	// Composite the layer back to the main canvas with a soft outer blur
	// that mirrors the feGaussianBlur in the SVG splotch filter.
	context.save();
	context.resetTransform();
	context.globalAlpha = 1;
	context.globalCompositeOperation = "source-over";
	context.filter = `blur(${cellRadius * BLUR_RATIO * devicePixelsPerUnit}px)`;
	context.drawImage(layer, 0, 0);
	context.restore();
};

// Watercolor rendering for the 2D map's binned modes. Each bin becomes a
// soft, irregular pigment blob; blobs are painted onto an offscreen layer
// and composited back blurred, so neighboring colors bleed into each other.

export type WatercolorCell = {
	key: string;
	x: number;
	y: number;
	fill: string;
};

type WashPass = {
	// Blob radius as a multiple of the bin's screen radius.
	spread: number;
	alpha: number;
	// Blur radius as a multiple of the bin's screen radius.
	blurRatio: number;
};

// A wide, faint wash that bleeds far, then a denser pigment body on top.
const WASH_PASSES: readonly WashPass[] = [
	{ spread: 2.2, alpha: 0.22, blurRatio: 0.6 },
	{ spread: 1.35, alpha: 0.5, blurRatio: 0.2 }
];
const BLOB_LOBE_COUNT = 3;
const LOBE_INDICES = Array.from({ length: BLOB_LOBE_COUNT }, (_, lobe) => lobe);
// How much each lobe's radius and offset wander, as a share of blob radius.
const BLOB_IRREGULARITY = 0.35;
const FULL_TURN = Math.PI * 2;
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const UINT32_RANGE = 2 ** 32;

// How far past a bin's center its paint can reach, in bin radii. Bins
// further than this off screen can be skipped.
export const WATERCOLOR_REACH = Math.max(
	...WASH_PASSES.map(
		(pass) => pass.spread * (1 + BLOB_IRREGULARITY) + pass.blurRatio
	)
);

const unitHash = (text: string): number =>
	[...text].reduce(
		(hash, character) =>
			Math.imul(hash ^ character.charCodeAt(0), FNV_PRIME) >>> 0,
		FNV_OFFSET_BASIS
	) / UINT32_RANGE;

const traceBlob = (
	context: CanvasRenderingContext2D,
	cell: WatercolorCell,
	radius: number
) => {
	context.beginPath();
	for (const lobe of LOBE_INDICES) {
		const angle =
			FULL_TURN * (lobe / BLOB_LOBE_COUNT + unitHash(`${cell.key}a${lobe}`));
		const offset = radius * BLOB_IRREGULARITY * unitHash(`${cell.key}o${lobe}`);
		const lobeRadius =
			radius *
			(1 - BLOB_IRREGULARITY / 2 + BLOB_IRREGULARITY * unitHash(`${cell.key}r${lobe}`));
		const centerX = cell.x + offset * Math.cos(angle);
		const centerY = cell.y + offset * Math.sin(angle);
		context.moveTo(centerX + lobeRadius, centerY);
		context.arc(centerX, centerY, lobeRadius, 0, FULL_TURN);
	}
	context.fill();
};

const matchLayerSize = (layer: HTMLCanvasElement, target: HTMLCanvasElement) => {
	if (layer.width !== target.width) layer.width = target.width;
	if (layer.height !== target.height) layer.height = target.height;
};

// Paints cells in order (later cells sit on top) onto `context`, using
// `layer` as scratch space. Cell positions are in the context's current
// coordinate space; cellRadius is the bin radius in that space.
export const paintWatercolor = (
	context: CanvasRenderingContext2D,
	layer: HTMLCanvasElement,
	cells: readonly WatercolorCell[],
	cellRadius: number
) => {
	const layerContext = layer.getContext("2d");
	if (!layerContext) return;
	matchLayerSize(layer, context.canvas);
	const transform = context.getTransform();
	const devicePixelsPerUnit = Math.hypot(transform.a, transform.b);

	for (const pass of WASH_PASSES) {
		layerContext.resetTransform();
		layerContext.clearRect(0, 0, layer.width, layer.height);
		layerContext.setTransform(transform);
		layerContext.globalAlpha = pass.alpha;
		for (const cell of cells) {
			layerContext.fillStyle = cell.fill;
			traceBlob(layerContext, cell, cellRadius * pass.spread);
		}

		context.save();
		context.resetTransform();
		context.globalAlpha = 1;
		context.filter = `blur(${cellRadius * pass.blurRatio * devicePixelsPerUnit}px)`;
		context.drawImage(layer, 0, 0);
		context.restore();
	}
};

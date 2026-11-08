import { hexKey, type HexBin } from "../../../embedding/layout/hexBins.js";

// Corner i of a pointy-top hex, starting at the upper right.
export const hexCorner = (
	centerX: number,
	centerY: number,
	radius: number,
	index: number
): [number, number] => {
	const angle = (Math.PI / 180) * (60 * index - 30);
	return [
		centerX + radius * Math.cos(angle),
		centerY + radius * Math.sin(angle)
	];
};

export const traceHex = (
	context: CanvasRenderingContext2D,
	centerX: number,
	centerY: number,
	radius: number
) => {
	context.beginPath();
	for (let corner = 0; corner < 6; corner++) {
		const [x, y] = hexCorner(centerX, centerY, radius, corner);
		if (corner === 0) context.moveTo(x, y);
		else context.lineTo(x, y);
	}
	context.closePath();
};

// Neighbor across each hex edge, in traceHex's corner order: edge i runs
// from corner i to corner i + 1 and faces 60·i degrees (y down).
export const EDGE_NEIGHBOR_OFFSETS: readonly [number, number][] = [
	[1, 0],
	[0, 1],
	[-1, 1],
	[-1, 0],
	[0, -1],
	[1, -1]
];

// Adds to the current path the outer edges of the hexes that pass
// isInside: only edges whose neighbor doesn't, so a group reads as one
// shape, including each of its separate patches. center maps a bin to
// its screen center.
export const traceGroupOutline = (
	context: CanvasRenderingContext2D,
	bins: ReadonlyMap<string, HexBin>,
	isInside: (key: string) => boolean,
	center: (bin: HexBin) => [number, number],
	radius: number
) => {
	for (const [key, bin] of bins) {
		if (!isInside(key)) continue;
		const [x, y] = center(bin);
		EDGE_NEIGHBOR_OFFSETS.forEach(([dq, dr], edge) => {
			if (isInside(hexKey(bin.q + dq, bin.r + dr))) return;
			const [startX, startY] = hexCorner(x, y, radius, edge);
			const [endX, endY] = hexCorner(x, y, radius, edge + 1);
			context.moveTo(startX, startY);
			context.lineTo(endX, endY);
		});
	}
};

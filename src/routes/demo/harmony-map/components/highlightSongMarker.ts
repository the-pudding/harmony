export const HIGHLIGHT_RING_COLOR = "#fbbf24";
const HIGHLIGHT_RING_OFFSET_PX = 3;
export const HIGHLIGHT_DEFAULT_POINT_RADIUS_PX = 3;

export const highlightRingDiameterPx = (
	pointRadiusPx: number,
	ringGapPx: number = HIGHLIGHT_RING_OFFSET_PX
): number => (pointRadiusPx + ringGapPx) * 2;

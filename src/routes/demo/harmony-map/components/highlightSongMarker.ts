import type { LabelDepthStyle } from "./labelDepthStyle.js";

export const HIGHLIGHT_RING_COLOR = "#fbbf24";
export const HIGHLIGHT_RING_WIDTH_PX = 1.25;
export const HIGHLIGHT_RING_OFFSET_PX = 3;
export const HIGHLIGHT_LABEL_COLOR = "#fde68a";
export const HIGHLIGHT_LABEL_FONT =
	'10px "JetBrains Mono", ui-monospace, monospace';
export const HIGHLIGHT_LABEL_MAX_WIDTH_PX = 90;
export const HIGHLIGHT_LABEL_GAP_PX = 4;
export const HIGHLIGHT_DEFAULT_POINT_RADIUS_PX = 3;

export const truncateLabelToWidth = (
	context: CanvasRenderingContext2D,
	text: string,
	maxWidth: number
): string => {
	if (context.measureText(text).width <= maxWidth) return text;
	const ellipsis = "…";
	let truncated = text;
	while (
		truncated.length > 0 &&
		context.measureText(truncated + ellipsis).width > maxWidth
	) {
		truncated = truncated.slice(0, -1);
	}
	return truncated.length > 0 ? truncated + ellipsis : ellipsis;
};

export const highlightRingDiameterPx = (
	pointRadiusPx: number,
	ringGapPx: number = HIGHLIGHT_RING_OFFSET_PX
): number => (pointRadiusPx + ringGapPx) * 2;

export const applyHighlightMarkerStyles = (element: HTMLElement): void => {
	element.style.setProperty("--ring-color", HIGHLIGHT_RING_COLOR);
	element.style.setProperty("--ring-width", `${HIGHLIGHT_RING_WIDTH_PX}px`);
	element.style.setProperty("--label-color", HIGHLIGHT_LABEL_COLOR);
	element.style.setProperty("--label-gap", `${HIGHLIGHT_LABEL_GAP_PX}px`);
	element.style.setProperty(
		"--label-max-width",
		`${HIGHLIGHT_LABEL_MAX_WIDTH_PX}px`
	);
};

export const applyHighlightMarkerDepthStyles = (
	element: HTMLElement,
	depthStyle: LabelDepthStyle,
	ringDiameterPx: number
): void => {
	element.style.setProperty("--ring-size", `${ringDiameterPx}px`);
	element.style.setProperty("--label-font-size", `${depthStyle.fontSizePx}px`);
	element.style.setProperty(
		"--label-max-width",
		`${depthStyle.labelMaxWidthPx}px`
	);
	element.style.setProperty(
		"--ring-width",
		`${HIGHLIGHT_RING_WIDTH_PX * depthStyle.depthScale}px`
	);
	element.style.setProperty(
		"--label-gap",
		`${HIGHLIGHT_LABEL_GAP_PX * depthStyle.depthScale}px`
	);
	element.style.opacity = String(depthStyle.opacity);
};

export const createHighlightMarkerElement = (
	title: string,
	pointRadiusPx: number = HIGHLIGHT_DEFAULT_POINT_RADIUS_PX,
	ringGapPx: number = HIGHLIGHT_RING_OFFSET_PX
): HTMLDivElement => {
	const root = document.createElement("div");
	root.className = "harmony-highlight-marker";
	applyHighlightMarkerStyles(root);
	root.style.setProperty(
		"--ring-size",
		`${highlightRingDiameterPx(pointRadiusPx, ringGapPx)}px`
	);

	const titleElement = document.createElement("span");
	titleElement.className = "harmony-highlight-title";
	titleElement.textContent = title;
	titleElement.title = title;

	const ringElement = document.createElement("div");
	ringElement.className = "harmony-highlight-ring";
	ringElement.setAttribute("aria-hidden", "true");

	root.append(titleElement, ringElement);
	return root;
};

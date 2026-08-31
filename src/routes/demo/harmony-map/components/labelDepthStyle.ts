export const LABEL_DEPTH_REFERENCE_VIEW_Z = 4.5;
const LABEL_DEPTH_MIN_VIEW_Z = 0.12;
const LABEL_DEPTH_MIN_SCALE = 0.35;
const LABEL_DEPTH_MAX_SCALE = 2.75;
export const LABEL_BASE_FONT_SIZE_PX = 10;
export const LABEL_BASE_MAX_WIDTH_PX = 90;
const LABEL_DEPTH_MIN_OPACITY = 0.42;
export const LABEL_DEPTH_FADE_VIEW_Z = 18;

export type LabelDepthStyle = {
	depthScale: number;
	fontSizePx: number;
	labelMaxWidthPx: number;
	opacity: number;
	viewDistance: number;
};

const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

export const labelDepthStyleFromViewDistance = (
	viewDistance: number
): LabelDepthStyle => {
	const clampedViewDistance = Math.max(viewDistance, LABEL_DEPTH_MIN_VIEW_Z);
	const depthScale = clamp(
		LABEL_DEPTH_REFERENCE_VIEW_Z / clampedViewDistance,
		LABEL_DEPTH_MIN_SCALE,
		LABEL_DEPTH_MAX_SCALE
	);
	const opacityFadeSpan = LABEL_DEPTH_FADE_VIEW_Z - LABEL_DEPTH_REFERENCE_VIEW_Z;
	const opacityT =
		opacityFadeSpan <= 0
			? 0
			: clamp(
					(clampedViewDistance - LABEL_DEPTH_REFERENCE_VIEW_Z) / opacityFadeSpan,
					0,
					1
				);
	const opacity = 1 - opacityT * (1 - LABEL_DEPTH_MIN_OPACITY);

	return {
		depthScale,
		fontSizePx: LABEL_BASE_FONT_SIZE_PX * depthScale,
		labelMaxWidthPx: LABEL_BASE_MAX_WIDTH_PX * depthScale,
		opacity,
		viewDistance: clampedViewDistance
	};
};

export const labelRenderOrderFromViewDistance = (viewDistance: number): number =>
	Math.round((LABEL_DEPTH_FADE_VIEW_Z - viewDistance) * 100);

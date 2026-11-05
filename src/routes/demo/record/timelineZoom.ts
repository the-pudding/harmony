export const ZOOM_LEVELS = [1, 2, 4, 8, 16, 32];
export const DEFAULT_ZOOM = ZOOM_LEVELS[0];

const FIRST_ZOOM_LEVEL_INDEX = 0;
const LAST_ZOOM_LEVEL_INDEX = ZOOM_LEVELS.length - 1;

export const isZoomLevel = (value: number): boolean =>
	ZOOM_LEVELS.includes(value);

export const steppedZoom = (zoom: number, step: number): number =>
	ZOOM_LEVELS[
		Math.min(
			Math.max(ZOOM_LEVELS.indexOf(zoom) + step, FIRST_ZOOM_LEVEL_INDEX),
			LAST_ZOOM_LEVEL_INDEX
		)
	];

export const canStepZoom = (zoom: number, step: number): boolean =>
	steppedZoom(zoom, step) !== zoom;

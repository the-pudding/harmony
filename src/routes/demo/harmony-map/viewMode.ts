export const MAP_VIEW_MODES = ["2d", "3d", "3dTime"] as const;
export type MapViewMode = (typeof MAP_VIEW_MODES)[number];

export const DEFAULT_MAP_VIEW_MODE: MapViewMode = "2d";

export const MAP_VIEW_MODE_LABELS: Record<MapViewMode, string> = {
	"2d": "2D",
	"3d": "3D",
	"3dTime": "3D w/ time"
};

export const MAP_VIEW_MODE_TO_URL: Record<MapViewMode, string> = {
	"2d": "2d",
	"3d": "3d",
	"3dTime": "3d-time"
};

const URL_TO_MAP_VIEW_MODE: Record<string, MapViewMode> = {
	"2d": "2d",
	"3d": "3d",
	"3d-time": "3dTime",
	"3dTime": "3dTime"
};

export const mapViewModeFromUrl = (value: string): MapViewMode | null =>
	URL_TO_MAP_VIEW_MODE[value] ?? null;

export const isMapViewMode = (value: string): value is MapViewMode =>
	(MAP_VIEW_MODES as readonly string[]).includes(value);

export const embeddingDimensionForViewMode = (
	viewMode: MapViewMode
): 2 | 3 => (viewMode === "3d" ? 3 : 2);

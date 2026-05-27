import type { GeoPermissibleObjects, GeoPath } from "d3";
import type { Feature, GeoJsonProperties, Point } from "geojson";
import type { Writable } from "svelte/store";

export type FigureMapFeature = Feature<Point> & {
	properties: GeoJsonProperties & {
		className?: string;
		fill?: string;
		label?: string;
	};
};

export type FigureCustomData = {
	projectionFn?: (coordinates: number[] | readonly number[]) => [number, number];
	pathFn?: GeoPath<unknown, GeoPermissibleObjects>;
	projectionObject?: GeoPermissibleObjects;
};

export type FigureContext = {
	width: Writable<number>;
	height: Writable<number>;
	dpr: Writable<number>;
	custom: Writable<FigureCustomData>;
};

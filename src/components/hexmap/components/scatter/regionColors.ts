import { interpolateLab } from "d3";
import {
	averageProgressionShare,
	type ClusterRegion,
	type ProgressionShare
} from "../../embedding/layout/hexBins.js";
import {
	CLUSTER_COLOR_STRATEGY,
	type ClusterColorInput,
	type ClusterColorStrategy
} from "../../clusterColors/index.js";
import {
	fitClusterEllipse2D,
	pointInsideClusterEllipse2D,
	type ClusterEllipse2D
} from "../../embedding/clustering/clusterBounds.js";
import { MIN_REGION_TINT } from "./constants.js";
import type { HexThemeColors, Point2D, SongPosition } from "./types.js";

// Songs density clustering left out that still sit inside a cluster's
// outline, by the cluster built on their main progression (the first of
// their shares). They're colored like members, so a stray that's mostly
// the cluster's progression isn't gray. toPixel is where a song is drawn
// at rest; outlines are fitted the way the map draws them, minus padding.
export const strayRegionsBySongKey = (
	points: readonly SongPosition[],
	regionBySongKey: ReadonlyMap<string, ClusterRegion>,
	sharesBySongKey: ReadonlyMap<string, readonly ProgressionShare[]>,
	toPixel: (point: SongPosition) => Point2D
): Map<string, ClusterRegion> => {
	const memberPixelsByRegion = new Map<ClusterRegion, Point2D[]>();
	for (const point of points) {
		const region = regionBySongKey.get(point.songKey);
		if (!region) continue;
		const pixels = memberPixelsByRegion.get(region) ?? [];
		pixels.push(toPixel(point));
		memberPixelsByRegion.set(region, pixels);
	}
	const outlines: { region: ClusterRegion; ellipse: ClusterEllipse2D }[] = [];
	for (const [region, pixels] of memberPixelsByRegion) {
		const ellipse = fitClusterEllipse2D(pixels, 0);
		if (ellipse) outlines.push({ region, ellipse });
	}

	const strays = new Map<string, ClusterRegion>();
	for (const point of points) {
		if (regionBySongKey.has(point.songKey)) continue;
		const mainProgression = sharesBySongKey.get(point.songKey)?.[0]?.name;
		if (mainProgression === undefined) continue;
		const pixel = toPixel(point);
		const outline = outlines.find(
			({ region, ellipse }) =>
				region.progressionNames.includes(mainProgression) &&
				pointInsideClusterEllipse2D(pixel, ellipse)
		);
		if (outline) strays.set(point.songKey, outline.region);
	}
	return strays;
};

// One color per cluster name, chosen by `strategy` (see clusterColors/).
// Clusters built on the same progression share its color.
export const regionColorsByName = (
	points: readonly SongPosition[],
	regionBySongKey: ReadonlyMap<string, ClusterRegion>,
	strategy: ClusterColorStrategy = CLUSTER_COLOR_STRATEGY
): Map<string, string> => {
	const totals = new Map<
		string,
		{
			x: number;
			y: number;
			weight: number;
			progressionNames: readonly string[];
		}
	>();
	for (const point of points) {
		const region = regionBySongKey.get(point.songKey);
		if (!region) continue;
		const total = totals.get(region.name) ?? {
			x: 0,
			y: 0,
			weight: 0,
			progressionNames: region.progressionNames
		};
		total.x += point.nx;
		total.y += point.ny;
		total.weight += 1;
		totals.set(region.name, total);
	}
	return strategy(
		[...totals].map(
			([name, total]): ClusterColorInput => ({
				name,
				progressionNames: total.progressionNames,
				x: total.x / total.weight,
				y: total.y / total.weight,
				weight: total.weight
			})
		)
	);
};

// A progression's map color: the color of a region built on it.
export const colorsByProgressionName = (
	regionBySongKey: ReadonlyMap<string, ClusterRegion> | null,
	colorByRegionName: ReadonlyMap<string, string>
): Map<string, string> => {
	const colors = new Map<string, string>();
	for (const region of new Set(regionBySongKey?.values() ?? [])) {
		const color = colorByRegionName.get(region.name);
		if (color === undefined) continue;
		for (const name of region.progressionNames) {
			if (!colors.has(name)) colors.set(name, color);
		}
	}
	return colors;
};

export type RegionFills = {
	// A region's color for a hex (or song) that's `share` its progression:
	// share 1 → the full color; lower shares fade toward the theme's faded
	// color. gradientStrength scales how much fading is applied, so
	// zoomed-out hexes read as solid regions.
	regionFill: (name: string | null, share: number, gradient: number) => string;
	// A song's color at dot zoom: its cluster's color (or, for a stray, the
	// cluster whose outline it sits in), faded by how much of the song is
	// that cluster's progression; gray outside clear clusters.
	songRegionFill: (songKey: string, gradient: number) => string;
};

export const createRegionFills = ({
	colorByRegionName,
	themeColors,
	regionBySongKey,
	strayRegionBySongKey = null,
	sharesBySongKey
}: {
	colorByRegionName: ReadonlyMap<string, string>;
	themeColors: HexThemeColors;
	regionBySongKey: ReadonlyMap<string, ClusterRegion> | null;
	strayRegionBySongKey?: ReadonlyMap<string, ClusterRegion> | null;
	sharesBySongKey: ReadonlyMap<string, readonly ProgressionShare[]> | null;
}): RegionFills => {
	// Lab, not HCL: blending toward a near-gray in HCL rotates the hue
	// (red drifts to magenta), which makes one cluster look multicolored.
	const interpolatorByName = new Map(
		[...colorByRegionName].map(([name, color]) => [
			name,
			interpolateLab(themeColors.faded, color)
		])
	);
	const regionFill: RegionFills["regionFill"] = (name, share, gradient) => {
		const interpolate =
			name === null ? undefined : interpolatorByName.get(name);
		if (!interpolate) return themeColors.unmatched;
		const strength = 1 - gradient * (1 - Math.min(1, Math.max(0, share)));
		return interpolate(MIN_REGION_TINT + (1 - MIN_REGION_TINT) * strength);
	};
	const songRegionFill: RegionFills["songRegionFill"] = (songKey, gradient) => {
		const region =
			regionBySongKey?.get(songKey) ?? strayRegionBySongKey?.get(songKey);
		if (!region) return themeColors.ambiguous;
		return regionFill(
			region.name,
			averageProgressionShare(
				[songKey],
				region.progressionNames,
				sharesBySongKey ?? new Map()
			),
			gradient
		);
	};
	return { regionFill, songRegionFill };
};

import {
	averageProgressionShare,
	binIntoHexes,
	dominantClusterRegion,
	findHexRegions,
	type ClusterRegion,
	type HexBin,
	type HexRegion,
	type ProgressionShare
} from "../../../embedding/layout/hexBins.js";
import { HEX_LABEL_MIN_HEXES, MIN_CLUSTER_SHARE_OF_HEX } from "../constants.js";
import { plotSize, toBasePixel } from "../viewport.js";

// The hex grid for one set of positions, plot size and hex radius, in
// base (unzoomed) pixels. Panning and zooming within one hex size reuse
// it, so a frame only transforms, culls and paints.
export type HexLayout = {
	radius: number;
	bins: Map<string, HexBin>;
	// The cluster holding most of each bin, or null for a gray bin.
	regionByKey: Map<string, ClusterRegion | null>;
	// Gray first, so colored hexes sit cleanly on top of the merged gray;
	// share is how much of the bin is its region's progression.
	orderedBins: {
		key: string;
		bin: HexBin;
		region: ClusterRegion | null;
		share: number;
	}[];
	// Connected same-cluster patches, largest first, for labels.
	labelRegions: HexRegion[];
	// Only regions that may be labeled.
	nameByRegionId: Map<string, string>;
};

export type HexLayoutInput = {
	radius: number;
	size: { width: number; height: number };
	// Every song's key and position (0–1 across the plot), by index.
	songKeys: readonly string[];
	x: Float32Array;
	y: Float32Array;
	// Bumped when songs come to rest somewhere new; the cache keys on it
	// because the arrays change in place.
	positionsVersion: number;
	// Which songs are binned, by index (above 0 = binned).
	visible: Float32Array;
	regionBySongKey: ReadonlyMap<string, ClusterRegion> | null;
	sharesBySongKey: ReadonlyMap<string, readonly ProgressionShare[]> | null;
};

export const buildHexLayout = ({
	radius,
	size,
	songKeys,
	x,
	y,
	visible,
	regionBySongKey,
	sharesBySongKey
}: HexLayoutInput): HexLayout => {
	const basePoints: { songKey: string; x: number; y: number }[] = [];
	for (let index = 0; index < songKeys.length; index++) {
		if (!(visible[index] > 0) || Number.isNaN(x[index])) continue;
		basePoints.push({
			songKey: songKeys[index],
			...toBasePixel(size, { nx: x[index], ny: y[index] })
		});
	}
	const bins = binIntoHexes(basePoints, radius);
	const regionByKey = new Map(
		[...bins].map(([key, bin]) => [
			key,
			regionBySongKey === null
				? null
				: dominantClusterRegion(
						bin.songKeys,
						regionBySongKey,
						MIN_CLUSTER_SHARE_OF_HEX
					)
		])
	);
	const orderedBins = [...bins]
		.map(([key, bin]) => {
			const region = regionByKey.get(key) ?? null;
			return {
				key,
				bin,
				region,
				share:
					region === null
						? 0
						: averageProgressionShare(
								bin.songKeys,
								region.progressionNames,
								sharesBySongKey ?? new Map()
							)
			};
		})
		.sort(
			(first, second) =>
				Number(first.region !== null) - Number(second.region !== null)
		);
	// Regions are connected hexes of the same cluster, so two clusters on
	// the same progression get separate labels. Gray hexes never do.
	const labelRegions = findHexRegions(
		bins,
		new Map(
			[...regionByKey].map(([key, region]) => [
				key,
				{ dominantName: region?.id ?? null }
			])
		),
		HEX_LABEL_MIN_HEXES
	);
	const nameByRegionId = new Map(
		[...regionByKey.values()].flatMap((region) =>
			region === null || !region.showLabel
				? []
				: [[region.id, region.name] as const]
		)
	);
	return {
		radius,
		bins,
		regionByKey,
		orderedBins,
		labelRegions,
		nameByRegionId
	};
};

// buildHexLayout, reused while its inputs are unchanged (by identity, and
// by value for the radius, plot size and positionsVersion).
export const createHexLayoutCache = () => {
	let cached: { key: readonly unknown[]; layout: HexLayout } | null = null;
	return (input: HexLayoutInput): HexLayout => {
		const plot = plotSize(input.size);
		const key = [
			input.radius,
			plot.width,
			plot.height,
			input.positionsVersion,
			input.songKeys,
			input.visible,
			input.regionBySongKey,
			input.sharesBySongKey
		];
		if (cached && key.every((value, index) => value === cached!.key[index])) {
			return cached.layout;
		}
		cached = { key, layout: buildHexLayout(input) };
		return cached.layout;
	};
};

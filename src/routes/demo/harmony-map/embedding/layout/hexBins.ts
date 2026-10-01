// Zoom-dependent hex binning for the 2D map's hex mode. Everything here is
// pure; EmbeddingScatter supplies positions in its base (unzoomed) pixel
// space and applies the zoom transform when drawing.
//
// Hexes are pointy-top in axial coordinates (q, r). A hex of radius R has
// its center at x = √3 R (q + r/2), y = 1.5 R r.

export type ProgressionShare = { name: string; share: number };

export type HexBin = {
	q: number;
	r: number;
	// Hex center in the same space as the binned points.
	x: number;
	y: number;
	songKeys: string[];
};

export type HexSummary = {
	// The progression covering the most of this hex's songs, or null when
	// none of its songs matched any progression.
	dominantName: string | null;
	// Average share of the dominant progression across the hex's songs
	// (songs that don't use it count as 0), from 0 to 1.
	dominantShare: number;
	top: ProgressionShare[];
	songCount: number;
};

export type HexZoomLevel =
	| { kind: "hex"; level: number; radius: number }
	| { kind: "dots" };

export type HexZoomOptions = {
	// Hex radius on screen at zoom 1, in pixels.
	baseScreenRadius: number;
	// At and above this zoom, show dots instead of hexes.
	dotsAtZoom: number;
	// How fast hexes shrink on screen as you zoom in: screen radius is
	// baseScreenRadius × zoom^-shrinkExponent. 0 keeps them the same size on
	// screen; higher shrinks them faster. Defaults to 0.5.
	shrinkExponent?: number;
};

// Hex radius on screen shrinks with zoom (see shrinkExponent), more slowly
// than the zoom itself, so each hex covers less and less of the map as you
// zoom in. Radii snap to steps of √2 so bins only change at those steps.
const SIZE_STEP = Math.SQRT2;
const DEFAULT_SHRINK_EXPONENT = 0.5;

export const hexZoomLevel = (
	zoom: number,
	{
		baseScreenRadius,
		dotsAtZoom,
		shrinkExponent = DEFAULT_SHRINK_EXPONENT
	}: HexZoomOptions
): HexZoomLevel => {
	if (zoom >= dotsAtZoom) return { kind: "dots" };
	const screenRadius = baseScreenRadius * zoom ** -shrinkExponent;
	const baseRadius = screenRadius / zoom;
	const level = Math.max(
		0,
		Math.round(Math.log(baseScreenRadius / baseRadius) / Math.log(SIZE_STEP))
	);
	return { kind: "hex", level, radius: baseScreenRadius / SIZE_STEP ** level };
};

// How much shading by share to apply at this zoom: low when zoomed out, so
// big hexes read as solid regions, rising to full as hexes approach dots.
export const gradientStrengthForZoom = (
	zoom: number,
	{ dotsAtZoom }: Pick<HexZoomOptions, "dotsAtZoom">,
	minimumStrength = 0.25
): number => {
	const progress = Math.min(
		1,
		Math.max(0, Math.log(Math.max(zoom, 1)) / Math.log(dotsAtZoom))
	);
	return minimumStrength + (1 - minimumStrength) * progress;
};

const SQRT3 = Math.sqrt(3);

export const axialForPoint = (
	x: number,
	y: number,
	radius: number
): { q: number; r: number } => {
	const fractionalQ = ((SQRT3 / 3) * x - y / 3) / radius;
	const fractionalR = ((2 / 3) * y) / radius;
	const fractionalS = -fractionalQ - fractionalR;
	let q = Math.round(fractionalQ);
	let r = Math.round(fractionalR);
	const s = Math.round(fractionalS);
	const deltaQ = Math.abs(q - fractionalQ);
	const deltaR = Math.abs(r - fractionalR);
	const deltaS = Math.abs(s - fractionalS);
	if (deltaQ > deltaR && deltaQ > deltaS) q = -r - s;
	else if (deltaR > deltaS) r = -q - s;
	return { q: q + 0, r: r + 0 };
};

export const hexCenter = (
	q: number,
	r: number,
	radius: number
): { x: number; y: number } => ({
	x: SQRT3 * radius * (q + r / 2),
	y: 1.5 * radius * r
});

export const hexKey = (q: number, r: number): string => `${q},${r}`;

export const binIntoHexes = (
	points: readonly { songKey: string; x: number; y: number }[],
	radius: number
): Map<string, HexBin> => {
	const bins = new Map<string, HexBin>();
	for (const point of points) {
		const { q, r } = axialForPoint(point.x, point.y, radius);
		const key = hexKey(q, r);
		const bin = bins.get(key);
		if (bin) bin.songKeys.push(point.songKey);
		else
			bins.set(key, {
				q,
				r,
				...hexCenter(q, r, radius),
				songKeys: [point.songKey]
			});
	}
	return bins;
};

const TOP_PROGRESSION_COUNT = 3;

export const summarizeHex = (
	songKeys: readonly string[],
	sharesBySongKey: ReadonlyMap<string, readonly ProgressionShare[]>
): HexSummary => {
	const totals = new Map<string, number>();
	for (const songKey of songKeys) {
		for (const { name, share } of sharesBySongKey.get(songKey) ?? []) {
			totals.set(name, (totals.get(name) ?? 0) + share);
		}
	}
	const ranked = [...totals]
		.map(([name, total]) => ({ name, share: total / songKeys.length }))
		.sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
	return {
		dominantName: ranked[0]?.name ?? null,
		dominantShare: ranked[0]?.share ?? 0,
		top: ranked.slice(0, TOP_PROGRESSION_COUNT),
		songCount: songKeys.length
	};
};

const NEIGHBOR_OFFSETS: readonly [number, number][] = [
	[1, 0],
	[1, -1],
	[0, -1],
	[-1, 0],
	[-1, 1],
	[0, 1]
];

export type HexRegion = {
	name: string;
	x: number;
	y: number;
	hexCount: number;
};

// Connected runs of hexes sharing a dominant progression, largest first,
// for placing one label per region.
export const findHexRegions = (
	bins: ReadonlyMap<string, HexBin>,
	summaries: ReadonlyMap<string, HexSummary>,
	minimumHexCount: number
): HexRegion[] => {
	const seen = new Set<string>();
	const regions: HexRegion[] = [];
	for (const [startKey, startBin] of bins) {
		const name = summaries.get(startKey)?.dominantName;
		if (!name || seen.has(startKey)) continue;
		const stack = [startBin];
		seen.add(startKey);
		let sumX = 0;
		let sumY = 0;
		let count = 0;
		while (stack.length > 0) {
			const bin = stack.pop()!;
			sumX += bin.x;
			sumY += bin.y;
			count++;
			for (const [dq, dr] of NEIGHBOR_OFFSETS) {
				const key = hexKey(bin.q + dq, bin.r + dr);
				const neighbor = bins.get(key);
				if (!neighbor || seen.has(key)) continue;
				if (summaries.get(key)?.dominantName !== name) continue;
				seen.add(key);
				stack.push(neighbor);
			}
		}
		if (count >= minimumHexCount) {
			regions.push({ name, x: sumX / count, y: sumY / count, hexCount: count });
		}
	}
	return regions.sort(
		(a, b) => b.hexCount - a.hexCount || a.name.localeCompare(b.name)
	);
};

export type ColorCandidate = {
	name: string;
	x: number;
	y: number;
	weight: number;
};

// Gives each progression a palette color such that progressions sitting near
// each other on the map never share a color or use a pair listed in
// `confusablePairs` (pairs too similar to tell apart, including for
// colorblind readers). Heaviest progressions pick first. Color only keeps
// neighbors apart; labels and tooltips carry which progression is which.
export const assignRegionColors = (
	candidates: readonly ColorCandidate[],
	palette: readonly string[],
	confusablePairs: ReadonlySet<string>,
	neighborCount = 8
): Map<string, string> => {
	const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
	const ordered = [...candidates].sort(
		(a, b) => b.weight - a.weight || a.name.localeCompare(b.name)
	);
	const colorByName = new Map<string, string>();
	const usage = new Map(palette.map((color) => [color, 0]));

	for (const candidate of ordered) {
		const neighbors = ordered
			.filter(
				(other) => other.name !== candidate.name && colorByName.has(other.name)
			)
			.map((other) => ({
				other,
				distance: Math.hypot(other.x - candidate.x, other.y - candidate.y)
			}))
			.sort((a, b) => a.distance - b.distance)
			.slice(0, neighborCount)
			.map(({ other }) => colorByName.get(other.name)!);

		const isAllowed = (color: string, strict: boolean) =>
			neighbors.every(
				(neighborColor) =>
					neighborColor !== color &&
					(!strict || !confusablePairs.has(pairKey(color, neighborColor)))
			);
		const byUsage = [...palette].sort(
			(a, b) =>
				(usage.get(a) ?? 0) - (usage.get(b) ?? 0) ||
				palette.indexOf(a) - palette.indexOf(b)
		);
		const color =
			byUsage.find((c) => isAllowed(c, true)) ??
			byUsage.find((c) => isAllowed(c, false)) ??
			byUsage[0];
		colorByName.set(candidate.name, color);
		usage.set(color, (usage.get(color) ?? 0) + 1);
	}
	return colorByName;
};

// A dense cluster as hex mode colors it: `name` is the progression most of
// its songs are built on, which also picks its color.
export type ClusterRegion = { id: string; name: string };

// The cluster that holds at least `minimumShare` of a hex's songs, or null
// when no single cluster does (the hex is unclustered or split between
// clusters, and is drawn gray).
export const dominantClusterRegion = (
	songKeys: readonly string[],
	regionBySongKey: ReadonlyMap<string, ClusterRegion>,
	minimumShare: number
): ClusterRegion | null => {
	const counts = new Map<string, { region: ClusterRegion; count: number }>();
	for (const songKey of songKeys) {
		const region = regionBySongKey.get(songKey);
		if (!region) continue;
		const entry = counts.get(region.id) ?? { region, count: 0 };
		entry.count++;
		counts.set(region.id, entry);
	}
	const top = [...counts.values()].sort(
		(a, b) => b.count - a.count || a.region.id.localeCompare(b.region.id)
	)[0];
	if (!top || songKeys.length === 0) return null;
	return top.count / songKeys.length >= minimumShare ? top.region : null;
};

// Average share of `name` across the songs, counting songs that don't use
// it as 0. Sets how strongly a hex or dot shows its cluster's color.
export const averageProgressionShare = (
	songKeys: readonly string[],
	name: string,
	sharesBySongKey: ReadonlyMap<string, readonly ProgressionShare[]>
): number =>
	songKeys.length === 0
		? 0
		: songKeys.reduce(
				(sum, songKey) =>
					sum +
					(sharesBySongKey.get(songKey)?.find((entry) => entry.name === name)
						?.share ?? 0),
				0
			) / songKeys.length;

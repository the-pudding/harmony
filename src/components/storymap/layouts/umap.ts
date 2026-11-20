// Today's map: the snapshot's UMAP positions, rearranged by the purity radial
// layout inside each cluster, then scaled into 0–1 (plus each song's tiny
// stable jitter, so songs with identical vectors stay pickable).
import { applyPurityRadialLayout } from "$components/hexmap/embedding/layout/purityRadialLayout.js";
import { POINT_RADIUS } from "$components/hexmap/components/scatter/constants.js";
import { normalizePoints } from "$components/hexmap/components/scatter/normalizePoints.js";
import type { ScatterPoint } from "$components/hexmap/components/scatterPoint.js";
import { yearStagger } from "./stagger.js";
import type { Layout } from "./types.js";

export type UmapParams = {
	// Pull each cluster's songs into a disk ordered by purity.
	purityLayout: boolean;
	// Songs at or above this dominant-progression share are fanned out.
	pureThreshold: number;
};

export const DEFAULT_UMAP_PARAMS: UmapParams = {
	purityLayout: true,
	pureThreshold: 0.9
};

export const umapLayout: Layout<UmapParams> = {
	name: "umap",
	framed: false,
	compute: ({ songs }, params) => {
		const points: ScatterPoint[] = songs.keys.map((songKey, index) => ({
			songKey,
			x: songs.umapX[index],
			y: songs.umapY[index],
			groupShares: [],
			homogeneityColor: ""
		}));
		const laidOut = params.purityLayout
			? applyPurityRadialLayout(
					points,
					songs.clusterMembers.map((members) => ({
						songKeys: members.map((index) => songs.keys[index])
					})),
					new Map(
						songs.keys.map((songKey, index) => [
							songKey,
							songs.homogeneity[index]?.dominantShare ?? 0
						])
					),
					{ pureThreshold: params.pureThreshold }
				)
			: points;
		const normalized = normalizePoints(laidOut);
		const x = new Float32Array(songs.count);
		const y = new Float32Array(songs.count);
		normalized.forEach((point, index) => {
			x[index] = point.nx;
			y[index] = point.ny;
		});
		return {
			name: "umap",
			x,
			y,
			framed: false,
			aggregate: "hex",
			color: "region",
			pointRadius: POINT_RADIUS,
			guides: [],
			// The sky (or anything else) organizes into the map oldest songs
			// first, sweeping through time.
			stagger: yearStagger(songs)
		};
	}
};

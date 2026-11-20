import {
	clusterEllipseBoundingRadius,
	fitClusterEllipse2D
} from "../../../embedding/clustering/clusterBounds.js";
import type { DensityCluster } from "../../../embedding/clustering/densityClusters.js";
import { clusterAnnotationAlpha } from "../../clusterAnnotationStyle.js";
import {
	CLUSTER_DASH_PATTERN,
	CLUSTER_DEEMPHASIZED_STROKE_ALPHA,
	CLUSTER_LABEL_COLOR,
	CLUSTER_LABEL_FONT,
	CLUSTER_LABEL_GAP,
	CLUSTER_NAME_COLOR,
	CLUSTER_NAME_FONT,
	CLUSTER_RADIUS_PADDING,
	CLUSTER_STROKE_COLOR,
	CLUSTER_STROKE_WIDTH,
	CLUSTER_UNNAMED_STROKE_ALPHA,
	FAMILY_INVOLVEMENT_THRESHOLD
} from "../constants.js";
import type { ClusterHit, Point2D } from "../types.js";
import { screenOfIndex, type Scene } from "./scene.js";

export type ClusterOutlineOptions = {
	clusters: readonly DensityCluster[];
	// Each cluster's songs by index, parallel to clusters.
	memberIndexes: readonly (readonly number[])[];
	names: ReadonlyMap<string, string>;
	emphasizedClusterHashes: Set<string> | null;
	// A cluster mostly outside this set draws faintly, unnamed.
	familyEmphasisSongKeys: Set<string> | null;
	showNames: boolean;
	// The cluster to show a song count under, if any.
	countClusterHash: string | null;
	// How much of each ellipse is drawn, 0 to 1, as it draws on.
	drawnFraction: number;
};

// Dashed ellipses around each cluster, fit to its songs' current screen
// positions so they animate along with their dots, with each name above.
// Returns each drawn cluster's ellipse for hit-testing.
export const drawClusterOutlines = (
	scene: Scene,
	{
		clusters,
		memberIndexes,
		names,
		emphasizedClusterHashes,
		familyEmphasisSongKeys,
		showNames,
		countClusterHash,
		drawnFraction
	}: ClusterOutlineOptions
): ClusterHit[] => {
	const { context } = scene;
	const hits: ClusterHit[] = [];
	for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
		const cluster = clusters[clusterIndex];
		const screenPositions: Point2D[] = [];
		for (const index of memberIndexes[clusterIndex]) {
			if (scene.alpha[index] > 0) {
				screenPositions.push(screenOfIndex(scene, index));
			}
		}
		if (screenPositions.length === 0) continue;

		const ellipse = fitClusterEllipse2D(
			screenPositions,
			CLUSTER_RADIUS_PADDING
		);
		if (!ellipse) continue;
		const boundingRadius = clusterEllipseBoundingRadius(ellipse);
		hits.push({ cluster, geometry: ellipse });

		const heavilyInvolvesFamily =
			!familyEmphasisSongKeys ||
			cluster.songKeys.filter((songKey) => familyEmphasisSongKeys.has(songKey))
				.length /
				cluster.songKeys.length >=
				FAMILY_INVOLVEMENT_THRESHOLD;

		const name = heavilyInvolvesFamily ? names.get(cluster.hash) : undefined;
		const strokeAlpha = !heavilyInvolvesFamily
			? CLUSTER_DEEMPHASIZED_STROKE_ALPHA
			: clusterAnnotationAlpha(
					emphasizedClusterHashes,
					cluster.hash,
					name !== undefined,
					CLUSTER_UNNAMED_STROKE_ALPHA
				);

		context.globalAlpha = strokeAlpha;
		context.setLineDash(CLUSTER_DASH_PATTERN);
		context.strokeStyle = CLUSTER_STROKE_COLOR;
		context.lineWidth = CLUSTER_STROKE_WIDTH;
		context.beginPath();
		context.ellipse(
			ellipse.centroid.x,
			ellipse.centroid.y,
			ellipse.semiAxisX,
			ellipse.semiAxisY,
			ellipse.rotationRadians,
			0,
			Math.PI * 2 * drawnFraction
		);
		context.stroke();
		context.setLineDash([]);
		context.globalAlpha = 1;

		if (name && showNames) {
			context.globalAlpha = strokeAlpha;
			context.fillStyle = CLUSTER_NAME_COLOR;
			context.font = CLUSTER_NAME_FONT;
			context.textAlign = "center";
			context.textBaseline = "alphabetic";
			context.fillText(
				name,
				ellipse.centroid.x,
				ellipse.centroid.y - boundingRadius - CLUSTER_LABEL_GAP
			);
		}

		if (countClusterHash === cluster.hash) {
			context.globalAlpha = strokeAlpha;
			context.fillStyle = CLUSTER_LABEL_COLOR;
			context.font = CLUSTER_LABEL_FONT;
			context.textAlign = "center";
			context.textBaseline = "top";
			context.fillText(
				`${screenPositions.length}`,
				ellipse.centroid.x,
				ellipse.centroid.y + boundingRadius + CLUSTER_LABEL_GAP
			);
			context.textBaseline = "alphabetic";
		}
	}
	return hits;
};

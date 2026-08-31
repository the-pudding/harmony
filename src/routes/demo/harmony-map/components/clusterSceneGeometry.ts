import * as THREE from "three";
import type { DensityCluster } from "../embedding/clustering/densityClusters.js";
import { fitClusterEllipsoid3D } from "../embedding/clustering/clusterBounds.js";

export type ClusterSceneGeometry = {
	cluster: DensityCluster;
	centroid: THREE.Vector3;
	memberPositions: THREE.Vector3[];
	semiAxes: THREE.Vector3;
	quaternion: THREE.Quaternion;
};

export const CLUSTER_SCENE_RADIUS_PADDING = 0.06;

export const buildClusterSceneGeometries = <T extends { songKey: string }>(
	clusters: readonly DensityCluster[],
	pointBySongKey: Map<string, T>,
	toScenePosition: (point: T) => THREE.Vector3
): ClusterSceneGeometry[] =>
	clusters.flatMap((cluster) => {
		const scenePositions = cluster.songKeys
			.map((songKey) => pointBySongKey.get(songKey))
			.filter((point): point is T => point !== undefined)
			.map((point) => toScenePosition(point));
		if (scenePositions.length === 0) return [];

		const ellipsoid = fitClusterEllipsoid3D(
			scenePositions,
			CLUSTER_SCENE_RADIUS_PADDING
		);
		if (!ellipsoid) return [];

		return [
			{
				cluster,
				centroid: ellipsoid.centroid,
				memberPositions: scenePositions,
				semiAxes: ellipsoid.semiAxes,
				quaternion: ellipsoid.quaternion
			}
		];
	});

import * as THREE from "three";
import type { DensityCluster } from "../embedding/clustering/densityClusters.js";

export type ClusterSceneGeometry = {
	cluster: DensityCluster;
	centroid: THREE.Vector3;
	memberPositions: THREE.Vector3[];
	radius: number;
};

export const CLUSTER_SCENE_RADIUS_PADDING = 0.06;

export const computeClusterRadius = (
	memberPositions: readonly THREE.Vector3[],
	centroid: THREE.Vector3,
	padding: number = CLUSTER_SCENE_RADIUS_PADDING
): number =>
	memberPositions.reduce(
		(max, position) => Math.max(max, position.distanceTo(centroid)),
		0
	) + padding;

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

		const centroid = scenePositions.reduce(
			(sum, position) => sum.add(position),
			new THREE.Vector3()
		);
		centroid.divideScalar(scenePositions.length);
		const radius = computeClusterRadius(scenePositions, centroid);

		return [{ cluster, centroid, memberPositions: scenePositions, radius }];
	});

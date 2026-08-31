import * as THREE from "three";
import type { ClusterSceneGeometry } from "./clusterSceneGeometry.js";

const CLUSTER_SPHERE_COLOR = 0xb8b8be;
const CLUSTER_SPHERE_OPACITY = 0.78;
const CLUSTER_SPHERE_SEGMENTS = 28;
const CLUSTER_SPHERE_RINGS = 20;

export type SceneClusterSpheres = {
	sync: (geometries: readonly ClusterSceneGeometry[]) => void;
	clear: () => void;
	dispose: () => void;
};

export const createSceneClusterSpheres = (
	scene: THREE.Scene
): SceneClusterSpheres => {
	const group = new THREE.Group();
	group.renderOrder = -10;
	scene.add(group);

	const sphereGeometry = new THREE.SphereGeometry(
		1,
		CLUSTER_SPHERE_SEGMENTS,
		CLUSTER_SPHERE_RINGS
	);
	const sphereMaterial = new THREE.MeshBasicMaterial({
		color: CLUSTER_SPHERE_COLOR,
		transparent: true,
		opacity: CLUSTER_SPHERE_OPACITY,
		depthWrite: false
	});

	const meshesByHash = new Map<string, THREE.Mesh>();

	const clear = () => {
		for (const mesh of meshesByHash.values()) group.remove(mesh);
		meshesByHash.clear();
	};

	const sync = (geometries: readonly ClusterSceneGeometry[]) => {
		const activeHashes = new Set(geometries.map((geometry) => geometry.cluster.hash));

		for (const [clusterHash, mesh] of meshesByHash) {
			if (!activeHashes.has(clusterHash)) {
				group.remove(mesh);
				meshesByHash.delete(clusterHash);
			}
		}

		for (const geometry of geometries) {
			const { cluster, centroid, radius } = geometry;
			let mesh = meshesByHash.get(cluster.hash);

			if (!mesh) {
				mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
				group.add(mesh);
				meshesByHash.set(cluster.hash, mesh);
			}

			mesh.position.copy(centroid);
			mesh.scale.setScalar(radius);
		}
	};

	const dispose = () => {
		clear();
		sphereGeometry.dispose();
		sphereMaterial.dispose();
		scene.remove(group);
	};

	return { sync, clear, dispose };
};

import * as THREE from "three";
import type { ClusterSceneGeometry } from "./clusterSceneGeometry.js";

const CLUSTER_SPHERE_COLOR = 0xb8b8be;
const CLUSTER_SPHERE_LIT_COLOR = 0xc8c8ce;
const CLUSTER_SPHERE_OPACITY = 0.78;
const CLUSTER_SPHERE_SEGMENTS = 28;
const CLUSTER_SPHERE_RINGS = 20;

export type SceneClusterSpheres = {
	sync: (geometries: readonly ClusterSceneGeometry[]) => void;
	setLightingEnabled: (enabled: boolean) => void;
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
	const unlitMaterial = new THREE.MeshBasicMaterial({
		color: CLUSTER_SPHERE_COLOR,
		transparent: true,
		opacity: CLUSTER_SPHERE_OPACITY,
		depthWrite: false
	});
	const litMaterial = new THREE.MeshLambertMaterial({
		color: CLUSTER_SPHERE_LIT_COLOR,
		transparent: true,
		opacity: CLUSTER_SPHERE_OPACITY,
		depthWrite: false
	});

	let lightingEnabled = false;
	const activeMaterial = (): THREE.Material =>
		lightingEnabled ? litMaterial : unlitMaterial;

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
				mesh = new THREE.Mesh(sphereGeometry, activeMaterial());
				group.add(mesh);
				meshesByHash.set(cluster.hash, mesh);
			}

			mesh.material = activeMaterial();
			mesh.position.copy(centroid);
			mesh.scale.setScalar(radius);
		}
	};

	const setLightingEnabled = (enabled: boolean) => {
		if (lightingEnabled === enabled) return;
		lightingEnabled = enabled;
		const material = activeMaterial();
		for (const mesh of meshesByHash.values()) {
			mesh.material = material;
		}
	};

	const dispose = () => {
		clear();
		sphereGeometry.dispose();
		unlitMaterial.dispose();
		litMaterial.dispose();
		scene.remove(group);
	};

	return { sync, setLightingEnabled, clear, dispose };
};

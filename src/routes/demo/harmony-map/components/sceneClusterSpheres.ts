import * as THREE from "three";
import type { ClusterSceneGeometry } from "./clusterSceneGeometry.js";

export const CLUSTER_SPHERE_COLOR = 0xb8b8be;
export const CLUSTER_SPHERE_LIT_COLOR = 0xc8c8ce;
export const CLUSTER_SPHERE_OPACITY = 0.78;
const CLUSTER_SPHERE_SEGMENTS = 28;
const CLUSTER_SPHERE_RINGS = 20;

type ClusterMeshMaterials = {
	unlit: THREE.MeshBasicMaterial;
	lit: THREE.MeshLambertMaterial;
};

export type SceneClusterSpheres = {
	sync: (
		geometries: readonly ClusterSceneGeometry[],
		opacityForCluster: (clusterHash: string) => number
	) => void;
	setLightingEnabled: (enabled: boolean) => void;
	clear: () => void;
	dispose: () => void;
};

const createClusterMeshMaterials = (opacity: number): ClusterMeshMaterials => ({
	unlit: new THREE.MeshBasicMaterial({
		color: CLUSTER_SPHERE_COLOR,
		transparent: true,
		opacity,
		depthWrite: false
	}),
	lit: new THREE.MeshLambertMaterial({
		color: CLUSTER_SPHERE_LIT_COLOR,
		transparent: true,
		opacity,
		depthWrite: false
	})
});

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

	let lightingEnabled = false;
	const meshesByHash = new Map<string, THREE.Mesh>();
	const materialsByHash = new Map<string, ClusterMeshMaterials>();

	const activeMaterialFor = (materials: ClusterMeshMaterials): THREE.Material =>
		lightingEnabled ? materials.lit : materials.unlit;

	const disposeMaterials = (materials: ClusterMeshMaterials) => {
		materials.unlit.dispose();
		materials.lit.dispose();
	};

	const removeCluster = (clusterHash: string) => {
		const mesh = meshesByHash.get(clusterHash);
		if (mesh) group.remove(mesh);
		meshesByHash.delete(clusterHash);
		const materials = materialsByHash.get(clusterHash);
		if (materials) {
			disposeMaterials(materials);
			materialsByHash.delete(clusterHash);
		}
	};

	const clear = () => {
		for (const clusterHash of [...meshesByHash.keys()]) {
			removeCluster(clusterHash);
		}
	};

	const sync = (
		geometries: readonly ClusterSceneGeometry[],
		opacityForCluster: (clusterHash: string) => number
	) => {
		const activeHashes = new Set(
			geometries.map((geometry) => geometry.cluster.hash)
		);

		for (const clusterHash of [...meshesByHash.keys()]) {
			if (!activeHashes.has(clusterHash)) removeCluster(clusterHash);
		}

		for (const geometry of geometries) {
			const { cluster, centroid, semiAxes, quaternion } = geometry;
			const opacity = opacityForCluster(cluster.hash);
			let materials = materialsByHash.get(cluster.hash);

			if (!materials) {
				materials = createClusterMeshMaterials(opacity);
				materialsByHash.set(cluster.hash, materials);
			} else {
				materials.unlit.opacity = opacity;
				materials.lit.opacity = opacity;
			}

			let mesh = meshesByHash.get(cluster.hash);
			if (!mesh) {
				mesh = new THREE.Mesh(sphereGeometry, activeMaterialFor(materials));
				group.add(mesh);
				meshesByHash.set(cluster.hash, mesh);
			}

			mesh.material = activeMaterialFor(materials);
			mesh.position.copy(centroid);
			mesh.quaternion.copy(quaternion);
			mesh.scale.copy(semiAxes);
		}
	};

	const setLightingEnabled = (enabled: boolean) => {
		if (lightingEnabled === enabled) return;
		lightingEnabled = enabled;
		for (const [clusterHash, mesh] of meshesByHash) {
			const materials = materialsByHash.get(clusterHash);
			if (!materials) continue;
			mesh.material = activeMaterialFor(materials);
		}
	};

	const dispose = () => {
		clear();
		sphereGeometry.dispose();
		scene.remove(group);
	};

	return { sync, setLightingEnabled, clear, dispose };
};

import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
	axisValueToSceneZ,
	buildDecadeAxisTicks,
	buildYearAxisExtent,
	type DecadeAxisTick
} from "../embedding/vectors/songYearAxis.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";

const TIME_AXIS_LINE_COLOR = 0x52525b;
const TIME_AXIS_TICK_COLOR = 0x71717a;
const TIME_AXIS_LINE_THICKNESS = 0.022;
const TIME_AXIS_TICK_HALF_LENGTH = 0.09;
const TIME_AXIS_TICK_THICKNESS = 0.014;
const TIME_DECADE_LABEL_FONT_SIZE_REM = 0.75;

export type SceneTimeAxis = {
	sync: (songs: readonly GroupedSong[], sceneScale: number) => void;
	clear: () => void;
	dispose: () => void;
};

const createDecadeLabelElement = (label: string): HTMLDivElement => {
	const element = document.createElement("div");
	element.className = "harmony-time-decade-label";
	element.textContent = label;
	element.style.fontSize = `${TIME_DECADE_LABEL_FONT_SIZE_REM}rem`;
	return element;
};

const createAxisLineMesh = (
	minZ: number,
	maxZ: number,
	material: THREE.MeshBasicMaterial
): THREE.Mesh => {
	const length = Math.abs(maxZ - minZ);
	const geometry = new THREE.BoxGeometry(
		TIME_AXIS_LINE_THICKNESS,
		TIME_AXIS_LINE_THICKNESS,
		length
	);
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(0, 0, (minZ + maxZ) / 2);
	return mesh;
};

const createTickMeshes = (
	ticks: DecadeAxisTick[],
	sceneScale: number,
	material: THREE.MeshBasicMaterial
): THREE.Mesh[] =>
	ticks.map((tick) => {
		const z = axisValueToSceneZ(tick.axisValue, sceneScale);
		const geometry = new THREE.BoxGeometry(
			TIME_AXIS_TICK_HALF_LENGTH * 2,
			TIME_AXIS_TICK_THICKNESS,
			TIME_AXIS_TICK_THICKNESS
		);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(0, 0, z);
		return mesh;
	});

export const createSceneTimeAxis = (scene: THREE.Scene): SceneTimeAxis => {
	const axisGroup = new THREE.Group();
	scene.add(axisGroup);

	let axisLine: THREE.Mesh | null = null;
	const tickMeshes: THREE.Mesh[] = [];
	const decadeLabels = new Map<number, CSS2DObject>();
	const disposables: Array<THREE.Material | THREE.BufferGeometry> = [];

	const clear = () => {
		for (const label of decadeLabels.values()) axisGroup.remove(label);
		decadeLabels.clear();
		if (axisLine) axisGroup.remove(axisLine);
		for (const tickMesh of tickMeshes) axisGroup.remove(tickMesh);
		tickMeshes.length = 0;
		axisLine = null;
		for (const disposable of disposables) disposable.dispose();
		disposables.length = 0;
	};

	const sync = (songs: readonly GroupedSong[], sceneScale: number) => {
		clear();
		const extent = buildYearAxisExtent(songs);
		if (extent === null) return;

		const minZ = axisValueToSceneZ(0, sceneScale);
		const maxZ = axisValueToSceneZ(1, sceneScale);
		const axisMaterial = new THREE.MeshBasicMaterial({
			color: TIME_AXIS_LINE_COLOR,
			transparent: true,
			opacity: 0.9,
			depthWrite: false
		});
		axisLine = createAxisLineMesh(minZ, maxZ, axisMaterial);
		axisGroup.add(axisLine);
		disposables.push(axisLine.geometry, axisMaterial);

		const ticks = buildDecadeAxisTicks(extent);
		if (ticks.length > 0) {
			const tickMaterial = new THREE.MeshBasicMaterial({
				color: TIME_AXIS_TICK_COLOR,
				transparent: true,
				opacity: 0.95,
				depthWrite: false
			});
			disposables.push(tickMaterial);
			for (const tickMesh of createTickMeshes(
				ticks,
				sceneScale,
				tickMaterial
			)) {
				axisGroup.add(tickMesh);
				tickMeshes.push(tickMesh);
				disposables.push(tickMesh.geometry);
			}
		}

		for (const tick of ticks) {
			const label = new CSS2DObject(createDecadeLabelElement(tick.label));
			label.position.set(0, 0, axisValueToSceneZ(tick.axisValue, sceneScale));
			axisGroup.add(label);
			decadeLabels.set(tick.decade, label);
		}
	};

	const dispose = () => {
		clear();
		scene.remove(axisGroup);
	};

	return { sync, clear, dispose };
};

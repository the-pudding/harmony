import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
	axisValueToSceneZ,
	buildDecadeAxisTicks,
	buildYearAxisExtent,
	type DecadeAxisTick,
	type YearAxisExtent
} from "../embedding/vectors/songYearAxis.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";

const TIME_AXIS_LINE_COLOR = 0x52525b;
const TIME_AXIS_TICK_COLOR = 0x71717a;
const TIME_AXIS_TICK_HALF_LENGTH = 0.06;

export type SceneTimeAxis = {
	sync: (songs: readonly GroupedSong[], sceneScale: number) => void;
	clear: () => void;
	dispose: () => void;
};

const createDecadeLabelElement = (label: string): HTMLDivElement => {
	const element = document.createElement("div");
	element.className = "harmony-time-decade-label";
	element.textContent = label;
	return element;
};

const buildAxisLineGeometry = (
	extent: YearAxisExtent,
	sceneScale: number
): THREE.BufferGeometry => {
	const minZ = axisValueToSceneZ(0, sceneScale);
	const maxZ = axisValueToSceneZ(1, sceneScale);
	const positions = new Float32Array([0, 0, minZ, 0, 0, maxZ]);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	return geometry;
};

const buildTickGeometries = (
	ticks: DecadeAxisTick[],
	sceneScale: number
): THREE.BufferGeometry => {
	const positions: number[] = [];
	for (const tick of ticks) {
		const z = axisValueToSceneZ(tick.axisValue, sceneScale);
		positions.push(
			-TIME_AXIS_TICK_HALF_LENGTH,
			0,
			z,
			TIME_AXIS_TICK_HALF_LENGTH,
			0,
			z
		);
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(new Float32Array(positions), 3)
	);
	return geometry;
};

export const createSceneTimeAxis = (scene: THREE.Scene): SceneTimeAxis => {
	const axisGroup = new THREE.Group();
	scene.add(axisGroup);

	let axisLine: THREE.Line | null = null;
	let tickLines: THREE.LineSegments | null = null;
	const decadeLabels = new Map<number, CSS2DObject>();
	const disposables: Array<THREE.Material | THREE.BufferGeometry> = [];

	const clear = () => {
		for (const label of decadeLabels.values()) axisGroup.remove(label);
		decadeLabels.clear();
		if (axisLine) axisGroup.remove(axisLine);
		if (tickLines) axisGroup.remove(tickLines);
		axisLine = null;
		tickLines = null;
		for (const disposable of disposables) disposable.dispose();
		disposables.length = 0;
	};

	const sync = (songs: readonly GroupedSong[], sceneScale: number) => {
		clear();
		const extent = buildYearAxisExtent(songs);
		if (extent === null) return;

		const axisGeometry = buildAxisLineGeometry(extent, sceneScale);
		const axisMaterial = new THREE.LineBasicMaterial({
			color: TIME_AXIS_LINE_COLOR,
			transparent: true,
			opacity: 0.85,
			depthWrite: false
		});
		axisLine = new THREE.Line(axisGeometry, axisMaterial);
		axisGroup.add(axisLine);
		disposables.push(axisGeometry, axisMaterial);

		const ticks = buildDecadeAxisTicks(extent);
		if (ticks.length > 0) {
			const tickGeometry = buildTickGeometries(ticks, sceneScale);
			const tickMaterial = new THREE.LineBasicMaterial({
				color: TIME_AXIS_TICK_COLOR,
				transparent: true,
				opacity: 0.9,
				depthWrite: false
			});
			tickLines = new THREE.LineSegments(tickGeometry, tickMaterial);
			axisGroup.add(tickLines);
			disposables.push(tickGeometry, tickMaterial);
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

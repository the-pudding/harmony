<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import * as THREE from "three";
	import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
	import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import { dominantColorForGroupShares } from "./groupColorBlend.js";
	import {
		applyHighlightMarkerDepthStyles,
		createHighlightMarkerElement,
		HIGHLIGHT_DEFAULT_POINT_RADIUS_PX,
		highlightRingDiameterPx
	} from "./highlightSongMarker.js";
	import {
		labelDepthStyleFromViewDistance,
		labelRenderOrderFromViewDistance,
		LABEL_DEPTH_REFERENCE_VIEW_Z
	} from "./labelDepthStyle.js";
	import SongTooltip from "../../shared/SongTooltip.svelte";
	import { createDelayedHoverTooltip } from "../../shared/delayedHoverTooltip.svelte.js";
	import { createClickAfterDragGuard } from "../../shared/clickAfterDragGuard.js";
	import {
		anchorFromMouseEvent,
		hoverCardStyle
	} from "../../shared/hoverCardPosition.js";
	import type { ScatterPoint } from "./scatterPoint.js";
	import { SCATTER_DIMMED_ALPHA, SCATTER_NORMAL_ALPHA } from "./scatterPoint.js";
	import type { DensityCluster } from "../embedding/clustering/densityClusters.js";
	import { buildClusterSceneGeometries } from "./clusterSceneGeometry.js";
	import { clusterMeshOpacity } from "./clusterAnnotationStyle.js";
	import {
		createSceneClusterSpheres,
		CLUSTER_SPHERE_OPACITY,
		type SceneClusterSpheres
	} from "./sceneClusterSpheres.js";
	import { createTimeAxisGizmo, type TimeAxisGizmo } from "./timeAxisGizmo.js";
	import { createSceneTimeAxis, type SceneTimeAxis } from "./sceneTimeAxis.js";
	import {
		createSceneLighting,
		type SceneLighting,
		type SceneLightingShaderUniforms
	} from "./sceneLighting.js";

	type Props = {
		points: ScatterPoint[];
		songByKey: Map<string, GroupedSong>;
		selectedSongKey: string | null;
		coClusterSongKeys: Set<string>;
		highlightedSongKeys: Set<string>;
		visibleSongKeys?: Set<string> | null;
		clusters: DensityCluster[];
		emphasizedClusterHashes: Set<string> | null;
		showTimeAxisGizmo?: boolean;
		enableSceneLighting?: boolean;
		onSelect: (songKey: string | null) => void;
	};

	const {
		points,
		songByKey,
		selectedSongKey,
		coClusterSongKeys,
		highlightedSongKeys,
		visibleSongKeys = null,
		clusters,
		emphasizedClusterHashes,
		showTimeAxisGizmo = false,
		enableSceneLighting = false,
		onSelect
	}: Props = $props();

	const MIN_CAMERA_DISTANCE = 0.06;
	const MAX_CAMERA_DISTANCE = 28;

	const SCENE_SCALE = 2;
	const POINT_SIZE_SCALE = 5;
	const BASE_POINT_SIZE = 0.04;
	const BASE_SELECTED_POINT_SIZE = 0.075;
	const BASE_HIGHLIGHT_POINT_SIZE = 0.06;
	const POINT_SIZE = BASE_POINT_SIZE * POINT_SIZE_SCALE;
	const SELECTED_POINT_SIZE = BASE_SELECTED_POINT_SIZE * POINT_SIZE_SCALE;
	const HIGHLIGHT_POINT_SIZE = BASE_HIGHLIGHT_POINT_SIZE * POINT_SIZE_SCALE;
	const HOVER_PICK_RADIUS_PX = 12;
	const JITTER_AMPLITUDE = 0.02;
	const BACKGROUND_COLOR = 0x09090b;
	const POINT_SIZE_SCREEN_SCALE = 300;
	const HIGHLIGHT_RING_GAP_PX = 1.5;
	const EMPHASIS_RING_EXTRA_PX = 2;

	type NormalizedPoint = ScatterPoint & { nx: number; ny: number; nz: number };

	let containerEl = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	let height = $state(0);
	let hoveredSongKey = $state<string | null>(null);

	const delayedTooltip = createDelayedHoverTooltip();
	const clickGuard = createClickAfterDragGuard();
	onDestroy(() => delayedTooltip.dispose());

	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let renderer: THREE.WebGLRenderer | null = null;
	let labelRenderer: CSS2DRenderer | null = null;
	let controls: OrbitControls | null = null;
	let pointsMesh: THREE.Points | null = null;
	let animationFrame = 0;
	let resizeObserver: ResizeObserver | null = null;
	let timeAxisGizmo: TimeAxisGizmo | null = null;
	let sceneTimeAxis: SceneTimeAxis | null = null;
	let sceneLighting: SceneLighting | null = null;
	let controlsInteractionActive = false;

	const highlightLabels = new Map<string, CSS2DObject>();
	const emphasisRings = new Map<string, CSS2DObject>();
	let clusterSceneGeometries: ReturnType<typeof buildClusterSceneGeometries> = [];
	let sceneClusterSpheres: SceneClusterSpheres | null = null;

	const normalize = (value: number, min: number, max: number): number =>
		max === min ? 0.5 : (value - min) / (max - min);

	const jitterFor = (songKey: string): { nx: number; ny: number; nz: number } => {
		const hash = [...songKey].reduce(
			(accumulator, character) =>
				(accumulator * 31 + character.charCodeAt(0)) % 100003,
			7
		);
		return {
			nx: ((hash % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2,
			ny: (((hash / 101) % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2,
			nz: (((hash / 10201) % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2
		};
	};

	const normalizedPoints = $derived.by((): NormalizedPoint[] => {
		if (points.length === 0) return [];
		const bounds = points.reduce(
			(extent, point) => ({
				minX: Math.min(extent.minX, point.x),
				maxX: Math.max(extent.maxX, point.x),
				minY: Math.min(extent.minY, point.y),
				maxY: Math.max(extent.maxY, point.y),
				minZ: Math.min(extent.minZ, point.z ?? 0),
				maxZ: Math.max(extent.maxZ, point.z ?? 0)
			}),
			{
				minX: Infinity,
				maxX: -Infinity,
				minY: Infinity,
				maxY: -Infinity,
				minZ: Infinity,
				maxZ: -Infinity
			}
		);
		return points.map((point) => {
			const jitter = jitterFor(point.songKey);
			return {
				...point,
				nx: normalize(point.x, bounds.minX, bounds.maxX) + jitter.nx,
				ny: normalize(point.y, bounds.minY, bounds.maxY) + jitter.ny,
				nz: normalize(point.z ?? 0, bounds.minZ, bounds.maxZ) + jitter.nz
			};
		});
	});

	const drawablePoints = $derived(
		visibleSongKeys === null
			? normalizedPoints
			: normalizedPoints.filter((point) => visibleSongKeys.has(point.songKey))
	);

	const songs = $derived([...songByKey.values()]);

	const pointBySongKey = $derived(
		new Map(drawablePoints.map((point) => [point.songKey, point]))
	);

	const syncSceneTimeAxis = () => {
		if (!sceneTimeAxis) return;
		if (!showTimeAxisGizmo) {
			sceneTimeAxis.clear();
			return;
		}
		sceneTimeAxis.sync(songs, SCENE_SCALE);
	};

	const toScenePosition = (point: NormalizedPoint): THREE.Vector3 =>
		new THREE.Vector3(
			(point.nx - 0.5) * SCENE_SCALE,
			(point.ny - 0.5) * SCENE_SCALE,
			(point.nz - 0.5) * SCENE_SCALE
		);

	const rebuildClusterSceneGeometries = () => {
		clusterSceneGeometries = buildClusterSceneGeometries(
			clusters,
			pointBySongKey,
			toScenePosition
		);
	};

	const syncClusterSpheres = () => {
		if (!sceneClusterSpheres) return;
		if (clusters.length === 0) {
			sceneClusterSpheres.clear();
			return;
		}
		sceneClusterSpheres.sync(clusterSceneGeometries, (clusterHash) =>
			clusterMeshOpacity(
				emphasizedClusterHashes,
				clusterHash,
				CLUSTER_SPHERE_OPACITY
			)
		);
	};

	const hexToThreeColor = (hex: string): THREE.Color => new THREE.Color(hex);

	const alphaFor = (songKey: string): number => {
		if (hoveredSongKey === songKey || highlightedSongKeys.has(songKey)) return 1;
		if (selectedSongKey === null) return SCATTER_NORMAL_ALPHA;
		if (songKey === selectedSongKey || coClusterSongKeys.has(songKey)) return 1;
		return SCATTER_DIMMED_ALPHA;
	};

	const sizeFor = (songKey: string): number => {
		if (songKey === selectedSongKey) return SELECTED_POINT_SIZE;
		if (highlightedSongKeys.has(songKey)) return HIGHLIGHT_POINT_SIZE;
		return POINT_SIZE;
	};

	const screenPointRadiusPx = (songKey: string, point: NormalizedPoint): number => {
		if (!camera) return HIGHLIGHT_DEFAULT_POINT_RADIUS_PX;
		const viewZ = toScenePosition(point).clone().applyMatrix4(camera.matrixWorldInverse).z;
		const pixelRatio = renderer?.getPixelRatio() ?? 1;
		return Math.max(
			HIGHLIGHT_DEFAULT_POINT_RADIUS_PX,
			(sizeFor(songKey) * POINT_SIZE_SCREEN_SCALE) /
				Math.max(Math.abs(viewZ), 0.001) /
				2 /
				pixelRatio
		);
	};

	const viewDistanceForPoint = (point: NormalizedPoint): number => {
		if (!camera) return LABEL_DEPTH_REFERENCE_VIEW_Z;
		return Math.abs(
			toScenePosition(point).applyMatrix4(camera.matrixWorldInverse).z
		);
	};

	const buildPointsGeometry = (
		targetPoints: NormalizedPoint[]
	): THREE.BufferGeometry => {
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(targetPoints.length * 3);
		const colors = new Float32Array(targetPoints.length * 3);
		const alphas = new Float32Array(targetPoints.length);
		const sizes = new Float32Array(targetPoints.length);

		targetPoints.forEach((point, index) => {
			const position = toScenePosition(point);
			const offset = index * 3;
			positions[offset] = position.x;
			positions[offset + 1] = position.y;
			positions[offset + 2] = position.z;

			const color = hexToThreeColor(
				dominantColorForGroupShares(point.groupShares)
			);
			colors[offset] = color.r;
			colors[offset + 1] = color.g;
			colors[offset + 2] = color.b;
			alphas[index] = alphaFor(point.songKey);
			sizes[index] = sizeFor(point.songKey);
		});

		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
		geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
		return geometry;
	};

	const pointsMaterial = (lightingUniforms: SceneLightingShaderUniforms) =>
		new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: {
				uLightingEnabled: lightingUniforms.uLightingEnabled,
				uKeyLightDirectionView: lightingUniforms.uKeyLightDirectionView,
				uFillLightDirectionView: lightingUniforms.uFillLightDirectionView,
				uAmbient: lightingUniforms.uAmbient,
				uKeyStrength: lightingUniforms.uKeyStrength,
				uFillStrength: lightingUniforms.uFillStrength
			},
			vertexShader: `
				attribute float size;
				attribute float alpha;
				attribute vec3 color;
				varying vec3 vColor;
				varying float vAlpha;
				void main() {
					vColor = color;
					vAlpha = alpha;
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					gl_PointSize = size * (${POINT_SIZE_SCREEN_SCALE}.0 / -mvPosition.z);
					gl_Position = projectionMatrix * mvPosition;
				}
			`,
			fragmentShader: `
				uniform float uLightingEnabled;
				uniform vec3 uKeyLightDirectionView;
				uniform vec3 uFillLightDirectionView;
				uniform float uAmbient;
				uniform float uKeyStrength;
				uniform float uFillStrength;
				varying vec3 vColor;
				varying float vAlpha;
				void main() {
					vec2 centered = gl_PointCoord - vec2(0.5);
					float dist = length(centered);
					if (dist > 0.5) discard;
					float edgeAlpha = smoothstep(0.5, 0.35, dist);
					vec3 litColor = vColor;
					if (uLightingEnabled > 0.5) {
						vec3 sphereNormal = normalize(vec3(
							centered * 2.0,
							sqrt(max(0.0, 1.0 - dot(centered * 2.0, centered * 2.0)))
						));
						float keyDiffuse = max(
							dot(sphereNormal, normalize(uKeyLightDirectionView)),
							0.0
						);
						float fillDiffuse = max(
							dot(sphereNormal, normalize(uFillLightDirectionView)),
							0.0
						);
						float lighting =
							uAmbient + uKeyStrength * keyDiffuse + uFillStrength * fillDiffuse;
						litColor = vColor * lighting;
					}
					gl_FragColor = vec4(litColor, vAlpha * edgeAlpha);
				}
			`
		});

	const updateMeshGeometry = (
		mesh: THREE.Points | null,
		targetPoints: NormalizedPoint[]
	) => {
		if (!mesh) return;
		mesh.geometry.dispose();
		mesh.geometry = buildPointsGeometry(targetPoints);
	};

	const createEmphasisRingElement = (diameterPx: number): HTMLDivElement => {
		const ring = document.createElement("div");
		ring.className = "harmony-emphasis-ring";
		ring.style.width = `${diameterPx}px`;
		ring.style.height = `${diameterPx}px`;
		return ring;
	};

	const syncHighlightLabels = () => {
		if (!scene) return;

		for (const [songKey, label] of highlightLabels) {
			if (!highlightedSongKeys.has(songKey) || !pointBySongKey.has(songKey)) {
				scene.remove(label);
				highlightLabels.delete(songKey);
			}
		}

		for (const songKey of highlightedSongKeys) {
			const point = pointBySongKey.get(songKey);
			if (!point) continue;

			const title = songByKey.get(songKey)?.title ?? songKey;
			const viewDistance = viewDistanceForPoint(point);
			const depthStyle = labelDepthStyleFromViewDistance(viewDistance);
			const pointRadiusPx = screenPointRadiusPx(songKey, point);
			const ringDiameterPx = highlightRingDiameterPx(
				pointRadiusPx,
				HIGHLIGHT_RING_GAP_PX * depthStyle.depthScale
			);
			let label = highlightLabels.get(songKey);

			if (!label) {
				label = new CSS2DObject(
					createHighlightMarkerElement(title, pointRadiusPx, HIGHLIGHT_RING_GAP_PX)
				);
				scene.add(label);
				highlightLabels.set(songKey, label);
			} else {
				const titleElement = label.element.querySelector(".harmony-highlight-title");
				if (titleElement) {
					titleElement.textContent = title;
					titleElement.setAttribute("title", title);
				}
			}

			applyHighlightMarkerDepthStyles(label.element, depthStyle, ringDiameterPx);
			label.position.copy(toScenePosition(point));
			label.renderOrder = labelRenderOrderFromViewDistance(viewDistance);
		}
	};

	const syncEmphasisRings = () => {
		if (!scene) return;

		const emphasizedSongKeys = [selectedSongKey, hoveredSongKey].filter(
			(songKey): songKey is string =>
				songKey !== null && pointBySongKey.has(songKey)
		);
		const emphasizedSet = new Set(emphasizedSongKeys);

		for (const [songKey, ring] of emphasisRings) {
			if (!emphasizedSet.has(songKey)) {
				scene.remove(ring);
				emphasisRings.delete(songKey);
			}
		}

		for (const songKey of emphasizedSongKeys) {
			const point = pointBySongKey.get(songKey);
			if (!point) continue;

			const viewDistance = viewDistanceForPoint(point);
			const depthStyle = labelDepthStyleFromViewDistance(viewDistance);
			const pointRadiusPx = screenPointRadiusPx(songKey, point);
			const ringDiameterPx =
				highlightRingDiameterPx(
					pointRadiusPx,
					HIGHLIGHT_RING_GAP_PX * depthStyle.depthScale
				) +
				EMPHASIS_RING_EXTRA_PX * depthStyle.depthScale;
			let ring = emphasisRings.get(songKey);

			if (!ring) {
				ring = new CSS2DObject(createEmphasisRingElement(ringDiameterPx));
				scene.add(ring);
				emphasisRings.set(songKey, ring);
			} else {
				ring.element.style.width = `${ringDiameterPx}px`;
				ring.element.style.height = `${ringDiameterPx}px`;
			}

			ring.element.style.opacity = String(depthStyle.opacity);
			ring.element.style.borderWidth = `${1.5 * depthStyle.depthScale}px`;
			ring.position.copy(toScenePosition(point));
			ring.renderOrder = labelRenderOrderFromViewDistance(viewDistance);
		}
	};

	const resizeRenderers = (nextWidth: number, nextHeight: number) => {
		if (nextWidth === 0 || nextHeight === 0) return;
		width = nextWidth;
		height = nextHeight;
		if (camera) {
			camera.aspect = nextWidth / nextHeight;
			camera.updateProjectionMatrix();
		}
		renderer?.setSize(nextWidth, nextHeight, false);
		labelRenderer?.setSize(nextWidth, nextHeight);
	};

	const updateMeshVisualAttributes = () => {
		if (!pointsMesh) return;
		const alphaAttr = pointsMesh.geometry.getAttribute("alpha");
		const sizeAttr = pointsMesh.geometry.getAttribute("size");
		if (!alphaAttr || !sizeAttr) return;

		drawablePoints.forEach((point, index) => {
			alphaAttr.setX(index, alphaFor(point.songKey));
			sizeAttr.setX(index, sizeFor(point.songKey));
		});
		alphaAttr.needsUpdate = true;
		sizeAttr.needsUpdate = true;
	};

	const findPointAt = (event: MouseEvent): string | null => {
		if (!camera || !renderer) return null;
		const activeCamera = camera;
		const rect = renderer.domElement.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;

		const pointerX = event.clientX - rect.left;
		const pointerY = event.clientY - rect.top;

		return drawablePoints.reduce<{ songKey: string | null; distance: number }>(
			(best, point) => {
				const scenePosition = toScenePosition(point);
				const viewZ = scenePosition
					.clone()
					.applyMatrix4(activeCamera.matrixWorldInverse)
					.z;
				if (viewZ > 0) return best;

				const projected = scenePosition.clone().project(activeCamera);
				const screenX = (projected.x * 0.5 + 0.5) * rect.width;
				const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
				const distance = Math.hypot(screenX - pointerX, screenY - pointerY);
				return distance < best.distance
					? { songKey: point.songKey, distance }
					: best;
			},
			{ songKey: null, distance: HOVER_PICK_RADIUS_PX }
		).songKey;
	};

	const handlePointerMove = (event: MouseEvent) => {
		if (!containerEl) return;
		clickGuard.onPointerMove(event);
		const anchor = anchorFromMouseEvent(event, containerEl);
		const songKey = findPointAt(event);
		hoveredSongKey = songKey;
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
	};

	const handlePointerLeave = () => {
		hoveredSongKey = null;
		delayedTooltip.clearHover();
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick()) return;
		const songKey = findPointAt(event);
		if (songKey !== null) {
			onSelect(songKey === selectedSongKey ? null : songKey);
			return;
		}
		onSelect(null);
	};

	const handlePointerDown = (event: PointerEvent) => {
		clickGuard.onPointerDown(event);
	};

	const handlePointerUp = () => {
		clickGuard.onPointerUp();
	};

	const renderFrame = () => {
		if (!renderer || !labelRenderer || !scene || !camera || !controls) return;
		controls.update();
		sceneLighting?.updateForCamera(camera);
		updateMeshVisualAttributes();
		syncHighlightLabels();
		syncEmphasisRings();
		renderer.render(scene, camera);
		labelRenderer.render(scene, camera);
		if (showTimeAxisGizmo && timeAxisGizmo && width > 0 && height > 0) {
			timeAxisGizmo.render(renderer, camera, width, height);
		}
	};

	const startAnimationLoop = () => {
		cancelAnimationFrame(animationFrame);
		const tick = () => {
			renderFrame();
			animationFrame = requestAnimationFrame(tick);
		};
		tick();
	};

	const clearOverlayObjects = () => {
		if (!scene) return;
		for (const label of highlightLabels.values()) scene.remove(label);
		for (const ring of emphasisRings.values()) scene.remove(ring);
		highlightLabels.clear();
		emphasisRings.clear();
	};

	const disposeScene = () => {
		cancelAnimationFrame(animationFrame);
		resizeObserver?.disconnect();
		resizeObserver = null;
		controls?.dispose();
		clearOverlayObjects();
		pointsMesh?.geometry.dispose();
		(pointsMesh?.material as THREE.Material | undefined)?.dispose();
		renderer?.dispose();
		labelRenderer?.domElement.remove();
		timeAxisGizmo?.dispose();
		timeAxisGizmo = null;
		sceneTimeAxis?.dispose();
		sceneTimeAxis = null;
		sceneLighting?.dispose();
		sceneLighting = null;
		sceneClusterSpheres?.dispose();
		sceneClusterSpheres = null;
		scene = null;
		camera = null;
		renderer = null;
		labelRenderer = null;
		controls = null;
		pointsMesh = null;
	};

	$effect(() => {
		const container = containerEl;
		if (!container) return;

		let handleControlsStart: (() => void) | null = null;
		let handleControlsChange: (() => void) | null = null;
		let handleControlsEnd: (() => void) | null = null;

		untrack(() => {
			scene = new THREE.Scene();
			scene.background = new THREE.Color(BACKGROUND_COLOR);

			camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
			camera.position.set(0, 0, 4.5);

			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.domElement.className = "scatter-3d-canvas";
			container.appendChild(renderer.domElement);

			labelRenderer = new CSS2DRenderer();
			labelRenderer.domElement.className = "scatter-3d-label-layer";
			container.appendChild(labelRenderer.domElement);

			controls = new OrbitControls(camera, renderer.domElement);
			controls.enableDamping = true;
			controls.dampingFactor = 0.08;
			controls.rotateSpeed = 0.65;
			controls.zoomSpeed = 0.9;
			controls.panSpeed = 0.7;
			controls.minDistance = MIN_CAMERA_DISTANCE;
			controls.maxDistance = MAX_CAMERA_DISTANCE;
			handleControlsStart = () => {
				controlsInteractionActive = true;
				delayedTooltip.startDrag();
			};
			handleControlsChange = () => {
				if (controlsInteractionActive) clickGuard.onInteractionDragStart();
			};
			handleControlsEnd = () => {
				controlsInteractionActive = false;
				delayedTooltip.endDrag();
			};
			controls.addEventListener("start", handleControlsStart);
			controls.addEventListener("change", handleControlsChange);
			controls.addEventListener("end", handleControlsEnd);

			sceneLighting = createSceneLighting(scene);
			if (enableSceneLighting) sceneLighting.enable();

			pointsMesh = new THREE.Points(
				new THREE.BufferGeometry(),
				pointsMaterial(sceneLighting.shaderUniforms)
			);
			scene.add(pointsMesh);
			sceneTimeAxis = createSceneTimeAxis(scene);
			sceneClusterSpheres = createSceneClusterSpheres(scene);

			resizeObserver = new ResizeObserver((entries) => {
				const entry = entries[0];
				if (!entry) return;
				const { width: nextWidth, height: nextHeight } = entry.contentRect;
				resizeRenderers(nextWidth, nextHeight);
			});
			resizeObserver.observe(container);

			const { width: initialWidth, height: initialHeight } =
				container.getBoundingClientRect();
			resizeRenderers(initialWidth, initialHeight);

			startAnimationLoop();
		});

		return () => {
			if (handleControlsStart) {
				controls?.removeEventListener("start", handleControlsStart);
			}
			if (handleControlsChange) {
				controls?.removeEventListener("change", handleControlsChange);
			}
			if (handleControlsEnd) {
				controls?.removeEventListener("end", handleControlsEnd);
			}
			if (renderer?.domElement.parentElement === container) {
				renderer.domElement.remove();
			}
			labelRenderer?.domElement.remove();
			disposeScene();
		};
	});

	$effect(() => {
		void clusters;
		void emphasizedClusterHashes;
		void drawablePoints;
		untrack(() => {
			rebuildClusterSceneGeometries();
			syncClusterSpheres();
		});
	});

	$effect(() => {
		if (!pointsMesh) return;
		void selectedSongKey;
		void coClusterSongKeys;
		void highlightedSongKeys;
		void showTimeAxisGizmo;
		updateMeshGeometry(pointsMesh, drawablePoints);
	});

	$effect(() => {
		if (!renderer) return;
		if (showTimeAxisGizmo) {
			if (timeAxisGizmo === null) timeAxisGizmo = createTimeAxisGizmo();
		} else {
			timeAxisGizmo?.dispose();
			timeAxisGizmo = null;
		}
	});

	$effect(() => {
		if (!sceneTimeAxis) return;
		void showTimeAxisGizmo;
		void songs;
		syncSceneTimeAxis();
	});

	$effect(() => {
		if (!sceneLighting || !sceneClusterSpheres) return;
		if (enableSceneLighting) {
			sceneLighting.enable();
		} else {
			sceneLighting.disable();
		}
		sceneClusterSpheres.setLightingEnabled(enableSceneLighting);
	});

	const tooltipSong = $derived(
		delayedTooltip.tooltipSongKey === null
			? null
			: (songByKey.get(delayedTooltip.tooltipSongKey) ?? null)
	);

	const tooltipStyle = $derived(
		hoverCardStyle(delayedTooltip.tooltipAnchor, width)
	);

	const tooltipVisible = $derived(
		delayedTooltip.tooltipSongKey !== null &&
			pointBySongKey.has(delayedTooltip.tooltipSongKey)
	);
</script>

<div
	class="scatter-3d"
	bind:this={containerEl}
	role="button"
	tabindex="0"
	aria-label="Song embedding 3D scatter plot"
	onmousemove={handlePointerMove}
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	onmouseleave={handlePointerLeave}
	onclick={(event) => handleClick(event)}
	onkeydown={(event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			if (hoveredSongKey !== null) {
				onSelect(hoveredSongKey === selectedSongKey ? null : hoveredSongKey);
			} else {
				onSelect(null);
			}
		}
		if (event.key === "Escape") onSelect(null);
	}}
>
	<div class="hint">drag to rotate · scroll to zoom · shift+drag to pan</div>

	{#if tooltipSong && tooltipVisible && delayedTooltip.tooltipAnchor}
		<div
			class="tooltip"
			class:tooltip-collapsed={!delayedTooltip.tooltipExpanded}
			style={tooltipStyle}
		>
			<SongTooltip song={tooltipSong} expanded={delayedTooltip.tooltipExpanded} />
		</div>
	{/if}
</div>

<style>
	.scatter-3d {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		cursor: grab;
	}

	.scatter-3d:active {
		cursor: grabbing;
	}

	.scatter-3d :global(.scatter-3d-canvas),
	.scatter-3d :global(.scatter-3d-label-layer) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.scatter-3d :global(.scatter-3d-canvas) {
		display: block;
		z-index: 0;
	}

	.scatter-3d :global(.scatter-3d-label-layer) {
		pointer-events: none;
		overflow: hidden;
		z-index: 1;
	}

	.scatter-3d :global(.harmony-highlight-marker) {
		width: 0;
		height: 0;
		overflow: visible;
		pointer-events: none;
	}

	.scatter-3d :global(.harmony-highlight-ring) {
		position: absolute;
		left: 0;
		top: 0;
		width: var(--ring-size);
		height: var(--ring-size);
		border-radius: 9999px;
		border: var(--ring-width) solid var(--ring-color);
		box-sizing: border-box;
		transform: translate(-50%, -50%);
	}

	.scatter-3d :global(.harmony-highlight-title) {
		position: absolute;
		left: 0;
		top: 0;
		transform: translate(
			-50%,
			calc(-100% - var(--ring-size) / 2 - var(--label-gap))
		);
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: var(--label-font-size, 10px);
		color: var(--label-color);
		max-width: var(--label-max-width);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
	}

	.scatter-3d :global(.harmony-emphasis-ring) {
		border-radius: 9999px;
		border: 1.5px solid #f4f4f5;
		box-sizing: border-box;
		transform: translate(-50%, -50%);
	}

	.scatter-3d :global(.harmony-time-decade-label) {
		transform: translate(-50%, -50%);
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #a1a1aa;
		white-space: nowrap;
		pointer-events: none;
		text-shadow: 0 0 4px rgba(9, 9, 11, 0.9);
	}

	.hint {
		position: absolute;
		left: 0.75rem;
		bottom: 0.75rem;
		font-size: 0.65rem;
		color: #71717a;
		pointer-events: none;
		z-index: 5;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		z-index: 20;
		backdrop-filter: blur(8px);
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}

	.tooltip-collapsed {
		padding: 0.5rem 0.75rem;
		overflow: hidden;
	}
</style>

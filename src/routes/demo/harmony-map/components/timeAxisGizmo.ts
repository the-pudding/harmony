import * as THREE from "three";

export const GIZMO_VIEWPORT_SIZE_PX = 104;
export const GIZMO_MARGIN_PX = 12;

const GIZMO_PLANE_HALF_SIZE = 0.42;
const GIZMO_TIME_AXIS_LENGTH = 0.72;
const GIZMO_PLANE_COLOR = 0x27272a;
const GIZMO_PLANE_OPACITY = 0.4;
const GIZMO_SQUARE_COLOR = 0x52525b;
const GIZMO_TIME_AXIS_COLOR = 0xa1a1aa;
const GIZMO_TIME_LABEL_COLOR = "#d4d4d8";
const GIZMO_TIME_LABEL_OFFSET = 0.06;
const GIZMO_TIME_LABEL_CANVAS_SIZE_PX = 64;
const GIZMO_TIME_LABEL_FONT_SIZE_PX = 48;
const GIZMO_TIME_LABEL_SPRITE_SCALE = 0.14;
const GIZMO_CLEAR_COLOR = 0x18181b;
const GIZMO_CLEAR_ALPHA = 0.92;
const GIZMO_CAMERA_DISTANCE = 2.35;

export type TimeAxisGizmo = {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	render: (
		renderer: THREE.WebGLRenderer,
		mainCamera: THREE.PerspectiveCamera,
		viewportWidth: number,
		viewportHeight: number
	) => void;
	dispose: () => void;
};

const createTimeAxisLabelSprite = (label: string): THREE.Sprite => {
	const canvas = document.createElement("canvas");
	canvas.width = GIZMO_TIME_LABEL_CANVAS_SIZE_PX;
	canvas.height = GIZMO_TIME_LABEL_CANVAS_SIZE_PX;
	const context = canvas.getContext("2d");
	if (!context) {
		return new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false }));
	}

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = GIZMO_TIME_LABEL_COLOR;
	context.font = `600 ${GIZMO_TIME_LABEL_FONT_SIZE_PX}px "JetBrains Mono", ui-monospace, monospace`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText(label, canvas.width / 2, canvas.height / 2);

	const texture = new THREE.CanvasTexture(canvas);
	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		depthTest: false
	});
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(
		GIZMO_TIME_LABEL_SPRITE_SCALE,
		GIZMO_TIME_LABEL_SPRITE_SCALE,
		1
	);
	return sprite;
};

export const createTimeAxisGizmo = (): TimeAxisGizmo => {
	const scene = new THREE.Scene();
	const root = new THREE.Group();
	scene.add(root);

	const planeFill = new THREE.Mesh(
		new THREE.PlaneGeometry(
			GIZMO_PLANE_HALF_SIZE * 2,
			GIZMO_PLANE_HALF_SIZE * 2
		),
		new THREE.MeshBasicMaterial({
			color: GIZMO_PLANE_COLOR,
			transparent: true,
			opacity: GIZMO_PLANE_OPACITY,
			side: THREE.DoubleSide,
			depthWrite: false
		})
	);
	root.add(planeFill);

	const squareVertices = new Float32Array([
		-GIZMO_PLANE_HALF_SIZE,
		-GIZMO_PLANE_HALF_SIZE,
		0,
		GIZMO_PLANE_HALF_SIZE,
		-GIZMO_PLANE_HALF_SIZE,
		0,
		GIZMO_PLANE_HALF_SIZE,
		GIZMO_PLANE_HALF_SIZE,
		0,
		-GIZMO_PLANE_HALF_SIZE,
		GIZMO_PLANE_HALF_SIZE,
		0
	]);
	const squareGeometry = new THREE.BufferGeometry();
	squareGeometry.setAttribute(
		"position",
		new THREE.BufferAttribute(squareVertices, 3)
	);
	const squareOutline = new THREE.LineLoop(
		squareGeometry,
		new THREE.LineBasicMaterial({ color: GIZMO_SQUARE_COLOR })
	);
	root.add(squareOutline);

	const timeAxis = new THREE.ArrowHelper(
		new THREE.Vector3(0, 0, 1),
		new THREE.Vector3(0, 0, 0),
		GIZMO_TIME_AXIS_LENGTH,
		GIZMO_TIME_AXIS_COLOR,
		0.08,
		0.05
	);
	root.add(timeAxis);

	const timeLabel = createTimeAxisLabelSprite("t");
	timeLabel.position.set(
		0,
		0,
		GIZMO_TIME_AXIS_LENGTH + GIZMO_TIME_LABEL_OFFSET
	);
	root.add(timeLabel);

	const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
	camera.position.set(0, 0, GIZMO_CAMERA_DISTANCE);
	camera.lookAt(0, 0, 0);

	const disposables: THREE.Material[] = [
		planeFill.material as THREE.Material,
		squareOutline.material as THREE.Material,
		timeLabel.material as THREE.Material
	];

	const render = (
		renderer: THREE.WebGLRenderer,
		mainCamera: THREE.PerspectiveCamera,
		viewportWidth: number,
		viewportHeight: number
	) => {
		const gizmoX = viewportWidth - GIZMO_VIEWPORT_SIZE_PX - GIZMO_MARGIN_PX;
		const gizmoY = viewportHeight - GIZMO_VIEWPORT_SIZE_PX - GIZMO_MARGIN_PX;

		root.quaternion.copy(mainCamera.quaternion).invert();

		const autoClear = renderer.autoClear;
		renderer.autoClear = false;
		renderer.setScissorTest(true);
		renderer.setScissor(
			gizmoX,
			gizmoY,
			GIZMO_VIEWPORT_SIZE_PX,
			GIZMO_VIEWPORT_SIZE_PX
		);
		renderer.setViewport(
			gizmoX,
			gizmoY,
			GIZMO_VIEWPORT_SIZE_PX,
			GIZMO_VIEWPORT_SIZE_PX
		);
		renderer.setClearColor(GIZMO_CLEAR_COLOR, GIZMO_CLEAR_ALPHA);
		renderer.clear(true, true, true);
		renderer.render(scene, camera);
		renderer.setScissorTest(false);
		renderer.setViewport(0, 0, viewportWidth, viewportHeight);
		renderer.autoClear = autoClear;
	};

	const dispose = () => {
		planeFill.geometry.dispose();
		squareGeometry.dispose();
		timeAxis.dispose();
		const timeLabelTexture = (timeLabel.material as THREE.SpriteMaterial).map;
		timeLabelTexture?.dispose();
		for (const material of disposables) material.dispose();
	};

	return { scene, camera, render, dispose };
};

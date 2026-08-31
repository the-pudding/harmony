import * as THREE from "three";

const HEMISPHERE_SKY_COLOR = 0x9ca3b8;
const HEMISPHERE_GROUND_COLOR = 0x18181b;
const HEMISPHERE_INTENSITY = 0.55;

const AMBIENT_LIGHT_INTENSITY = 0.28;

const KEY_LIGHT_COLOR = 0xfff8f0;
const KEY_LIGHT_INTENSITY = 0.72;
const KEY_LIGHT_POSITION = new THREE.Vector3(2.8, 3.6, 4.2);

const FILL_LIGHT_COLOR = 0xc8d4f0;
const FILL_LIGHT_INTENSITY = 0.38;
const FILL_LIGHT_POSITION = new THREE.Vector3(-2.4, 1.2, -3.2);

const SHADER_AMBIENT = 0.58;
const SHADER_KEY_STRENGTH = 0.32;
const SHADER_FILL_STRENGTH = 0.22;

export type SceneLightingShaderUniforms = {
	uLightingEnabled: { value: number };
	uKeyLightDirectionView: { value: THREE.Vector3 };
	uFillLightDirectionView: { value: THREE.Vector3 };
	uAmbient: { value: number };
	uKeyStrength: { value: number };
	uFillStrength: { value: number };
};

export type SceneLighting = {
	enable: () => void;
	disable: () => void;
	updateForCamera: (camera: THREE.Camera) => void;
	dispose: () => void;
	shaderUniforms: SceneLightingShaderUniforms;
};

const worldDirectionFromPosition = (position: THREE.Vector3): THREE.Vector3 =>
	position.clone().normalize();

export const createSceneLighting = (scene: THREE.Scene): SceneLighting => {
	const hemisphereLight = new THREE.HemisphereLight(
		HEMISPHERE_SKY_COLOR,
		HEMISPHERE_GROUND_COLOR,
		HEMISPHERE_INTENSITY
	);
	const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
	const keyLight = new THREE.DirectionalLight(KEY_LIGHT_COLOR, KEY_LIGHT_INTENSITY);
	keyLight.position.copy(KEY_LIGHT_POSITION);
	const fillLight = new THREE.DirectionalLight(FILL_LIGHT_COLOR, FILL_LIGHT_INTENSITY);
	fillLight.position.copy(FILL_LIGHT_POSITION);

	const keyLightDirectionView = new THREE.Vector3();
	const fillLightDirectionView = new THREE.Vector3();
	const worldKeyDirection = worldDirectionFromPosition(KEY_LIGHT_POSITION);
	const worldFillDirection = worldDirectionFromPosition(FILL_LIGHT_POSITION);

	const shaderUniforms: SceneLightingShaderUniforms = {
		uLightingEnabled: { value: 0 },
		uKeyLightDirectionView: { value: new THREE.Vector3() },
		uFillLightDirectionView: { value: new THREE.Vector3() },
		uAmbient: { value: SHADER_AMBIENT },
		uKeyStrength: { value: SHADER_KEY_STRENGTH },
		uFillStrength: { value: SHADER_FILL_STRENGTH }
	};

	let enabled = false;

	const enable = () => {
		if (enabled) return;
		enabled = true;
		scene.add(hemisphereLight);
		scene.add(ambientLight);
		scene.add(keyLight);
		scene.add(fillLight);
		shaderUniforms.uLightingEnabled.value = 1;
	};

	const disable = () => {
		if (!enabled) return;
		enabled = false;
		scene.remove(hemisphereLight);
		scene.remove(ambientLight);
		scene.remove(keyLight);
		scene.remove(fillLight);
		shaderUniforms.uLightingEnabled.value = 0;
	};

	const updateForCamera = (camera: THREE.Camera) => {
		if (!enabled) return;
		keyLightDirectionView.copy(worldKeyDirection);
		keyLightDirectionView.transformDirection(camera.matrixWorldInverse);
		fillLightDirectionView.copy(worldFillDirection);
		fillLightDirectionView.transformDirection(camera.matrixWorldInverse);
		shaderUniforms.uKeyLightDirectionView.value.copy(keyLightDirectionView);
		shaderUniforms.uFillLightDirectionView.value.copy(fillLightDirectionView);
	};

	const dispose = () => {
		disable();
	};

	return { enable, disable, updateForCamera, dispose, shaderUniforms };
};

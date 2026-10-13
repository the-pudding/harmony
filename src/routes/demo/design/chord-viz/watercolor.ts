import { curveCardinalClosed, line } from "d3";
import type { ChordTone } from "./diatonicChords.js";

export type WatercolorSettings = {
	deviation: number;
	blur: number;
	noise: number;
};

export type WatercolorSlider = {
	key: keyof WatercolorSettings;
	title: string;
	min: number;
	max: number;
	step: number;
};

export const DEFAULT_WATERCOLOR_SETTINGS: WatercolorSettings = {
	deviation: 1,
	blur: 0.8,
	noise: 0.015
};

export const WATERCOLOR_SLIDERS: WatercolorSlider[] = [
	{ key: "deviation", title: "Shape deviation", min: 0, max: 5, step: 0.5 },
	{ key: "blur", title: "Outer blur amount", min: 0, max: 5, step: 0.1 },
	{ key: "noise", title: "Fractal noise", min: 0, max: 0.03, step: 0.001 }
];

export const CHORD_TONE_COLORS: Record<
	ChordTone,
	{ fill: string; text: string }
> = {
	major: { fill: "#a0d8e7", text: "#0b1d2a" },
	minor: { fill: "#4a2668", text: "#f4f4f5" }
};

export const BLOB_RADIUS = 30;
const BLOB_POINT_COUNT = 10;
export const BLOB_WOBBLE = 0.12;
const SPLINE_TENSION = 0.6;
const CHORD_PADDING = 12;
const FULL_TURN = Math.PI * 2;

export const CHORD_SIZE = 2 * (BLOB_RADIUS * (1 + BLOB_WOBBLE) + CHORD_PADDING);
export const CHORD_VIEWBOX = [
	-CHORD_SIZE / 2,
	-CHORD_SIZE / 2,
	CHORD_SIZE,
	CHORD_SIZE
].join(" ");

const CHORD_OVERLAP_FRACTION = 0.2;
const BLOB_DIAMETER = 2 * BLOB_RADIUS;

export const CHORD_OVERLAP_GAP = -(
	CHORD_SIZE -
	BLOB_DIAMETER +
	BLOB_DIAMETER * CHORD_OVERLAP_FRACTION
);

const BLUR_SCALE_MAX_AREA = 2000;
const BLUR_SCALE_MAX_FACTOR = 3.5;

export const thresholdBlurFor = (deviation: number, area: number): number =>
	deviation *
	(1 +
		(BLUR_SCALE_MAX_FACTOR - 1) *
			Math.min(Math.max(area / BLUR_SCALE_MAX_AREA, 0), 1));

export const BLOB_AREA = Math.PI * BLOB_RADIUS ** 2;

const HASH_FREQUENCY = 12.9898;
const HASH_AMPLITUDE = 43758.5453;

const pseudoRandom = (seed: number): number => {
	const value = Math.sin(seed * HASH_FREQUENCY) * HASH_AMPLITUDE;
	return value - Math.floor(value);
};

export const blobPoints = (seed: number): [number, number][] =>
	Array.from({ length: BLOB_POINT_COUNT }, (_, index) => {
		const angle = (index / BLOB_POINT_COUNT) * FULL_TURN;
		const wobble = pseudoRandom(seed * BLOB_POINT_COUNT + index + 1) * 2 - 1;
		const radius = BLOB_RADIUS * (1 + BLOB_WOBBLE * wobble);
		return [radius * Math.cos(angle), radius * Math.sin(angle)];
	});

const blobLine = line().curve(curveCardinalClosed.tension(SPLINE_TENSION));

export const blobPath = (seed: number): string =>
	blobLine(blobPoints(seed)) ?? "";

export const NOISE_OCTAVES = 4;
export const NOISE_ALPHA_MATRIX =
	"0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -0.9 1.2";
export const ALPHA_THRESHOLD_MATRIX =
	"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9";

export const PENCIL_FILTER = {
	baseFrequency: 0.03,
	octaves: 6,
	displacement: 4,
	blur: 0.5
};

export type WatercolorFilterIds = {
	splotch: string;
	threshold: string;
	pencil: string;
};

export const watercolorFilterIdsFor = (uid: string): WatercolorFilterIds => ({
	splotch: `splotch-${uid}`,
	threshold: `threshold-${uid}`,
	pencil: `pencil-${uid}`
});

export const FILTER_REGION = {
	x: "-50%",
	y: "-50%",
	width: "200%",
	height: "200%"
};

import { rgb } from "d3";
import type { ChordTone } from "./diatonicChords.js";
import { CHORD_TONE_COLORS } from "./watercolor.js";

export type GradientEffect =
	| "none"
	| "rainbow"
	| "radial"
	| "abrupt"
	| "animated";
export type BlendEffect = "normal" | "multiply" | "screen";

export type FloatingSettings = {
	animate: boolean;
	gradient: GradientEffect;
	blend: BlendEffect;
};

export type Option<T extends string> = { value: T; label: string };

export type GooeyChord = {
	id: string;
	roman: string;
	tone: ChordTone;
	x: number;
	y: number;
	radius: number;
};

export type FloatingIds = { gooey: string; gradientPrefix: string };

export const floatingIdsFor = (uid: string): FloatingIds => ({
	gooey: `gooey-${uid}`,
	gradientPrefix: `gradient-${uid}`
});

export type GradientStop = { offset: string; color: string };

export const DEFAULT_FLOATING_SETTINGS: FloatingSettings = {
	animate: false,
	gradient: "none",
	blend: "normal"
};

export const GRADIENT_OPTIONS: Option<GradientEffect>[] = [
	{ value: "none", label: "Chord colors" },
	{ value: "rainbow", label: "Rainbow background" },
	{ value: "radial", label: "Sphere / 3D" },
	{ value: "abrupt", label: "Abrupt" },
	{ value: "animated", label: "Animated" }
];

export const BLEND_OPTIONS: Option<BlendEffect>[] = [
	{ value: "normal", label: "None" },
	{ value: "multiply", label: "Multiply" },
	{ value: "screen", label: "Screen" }
];

const RAINBOW_COLORS = [
	"#2c7bb6",
	"#00a1c3",
	"#00c4b8",
	"#70e29f",
	"#cff88c",
	"#fceb74",
	"#f5c049",
	"#ee9429",
	"#e56219",
	"#d7191c"
];
const ANIMATED_COLORS = ["#ea0079", "#fc8669", "#ffc365"];
const ABRUPT_OUTER_COLOR = "#c4c4c4";
const ABRUPT_INNER_COLOR = "#fc0373";
const ABRUPT_EDGES = ["30%", "70%"];
const RADIAL_SHADE_STEP = 1;
const PERCENT = 100;
const NEUTRAL_LABEL_COLOR = "#18181b";

export const RADIAL_GEOMETRY = { cx: "25%", cy: "25%", r: "65%" };
export const ANIMATED_GRADIENT = {
	duration: "7s",
	x1Values: "0%;200%",
	x2Values: "100%;300%"
};

const evenlySpacedStops = (colors: string[]): GradientStop[] =>
	colors.map((color, index) => ({
		offset: `${(index / (colors.length - 1)) * PERCENT}%`,
		color
	}));

export const RAINBOW_STOPS = evenlySpacedStops(RAINBOW_COLORS);
export const ANIMATED_STOPS = evenlySpacedStops(ANIMATED_COLORS);

export const ABRUPT_STOPS: GradientStop[] = [
	{ offset: ABRUPT_EDGES[0], color: ABRUPT_OUTER_COLOR },
	{ offset: ABRUPT_EDGES[0], color: ABRUPT_INNER_COLOR },
	{ offset: ABRUPT_EDGES[1], color: ABRUPT_INNER_COLOR },
	{ offset: ABRUPT_EDGES[1], color: ABRUPT_OUTER_COLOR }
];

export const radialStopsFor = (color: string): GradientStop[] => [
	{ offset: "0%", color: rgb(color).brighter(RADIAL_SHADE_STEP).formatHex() },
	{ offset: "40%", color },
	{ offset: "100%", color: rgb(color).darker(RADIAL_SHADE_STEP).formatHex() }
];

export const CHORD_TONES = Object.keys(CHORD_TONE_COLORS) as ChordTone[];

export const gradientIdFor = (
	prefix: string,
	gradient: GradientEffect
): string => `${prefix}-${gradient}`;

export const radialGradientIdFor = (prefix: string, tone: ChordTone): string =>
	`${prefix}-radial-${tone}`;

const fillIdFor = (
	prefix: string,
	gradient: GradientEffect,
	tone: ChordTone
): string =>
	gradient === "radial"
		? radialGradientIdFor(prefix, tone)
		: gradientIdFor(prefix, gradient);

export const fillFor = (
	prefix: string,
	gradient: GradientEffect,
	tone: ChordTone
): string =>
	gradient === "none"
		? CHORD_TONE_COLORS[tone].fill
		: `url(#${fillIdFor(prefix, gradient, tone)})`;

const TONE_COLORED_GRADIENTS = new Set<GradientEffect>(["none", "radial"]);

export const labelColorFor = (
	gradient: GradientEffect,
	tone: ChordTone
): string =>
	TONE_COLORED_GRADIENTS.has(gradient)
		? CHORD_TONE_COLORS[tone].text
		: NEUTRAL_LABEL_COLOR;

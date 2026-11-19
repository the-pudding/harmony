import { describe, expect, it } from "vitest";
import { zoomIdentity } from "d3";
import { HEX_THEME_COLORS } from "../constants.js";
import { createPointStyle } from "../pointStyle.js";
import { drawDots } from "./dots.js";
import { createScene } from "./scene.js";

// A canvas context that records each fill() with its style and how many
// dots its path holds.
const recordingContext = () => {
	const fills: { fillStyle: string; globalAlpha: number; dots: number }[] = [];
	let dots = 0;
	const context = {
		globalAlpha: 1,
		fillStyle: "",
		beginPath: () => {
			dots = 0;
		},
		moveTo: () => {},
		arc: () => {
			dots++;
		},
		fill() {
			fills.push({
				fillStyle: this.fillStyle,
				globalAlpha: this.globalAlpha,
				dots
			});
		}
	};
	return { context: context as unknown as CanvasRenderingContext2D, fills };
};

const songKeys = ["a", "b", "c", "d", "e"];

const setUp = ({
	alpha = [1, 1, 1, 1, 1],
	x = [0.1, 0.2, 0.3, 0.4, 0.5]
}: { alpha?: number[]; x?: number[] } = {}) => {
	const { context, fills } = recordingContext();
	const scene = createScene({
		context,
		viewport: {
			width: 400,
			height: 300,
			offsetY: 0,
			transform: zoomIdentity
		},
		x: Float32Array.from(x),
		y: Float32Array.from(x),
		alpha: Float32Array.from(alpha),
		indexOf: new Map(songKeys.map((songKey, index) => [songKey, index])),
		themeColors: HEX_THEME_COLORS.dark
	});
	const style = createPointStyle({
		spotlight: { emphasis: new Map(), fade: 0 },
		outlinedSongKeys: new Set(["e"]),
		hoveredSongKey: null,
		selectedSongKey: null,
		coClusterSongKeys: new Set()
	});
	return { scene, style, fills };
};

const fillBySong: Record<string, string> = {
	a: "red",
	b: "blue",
	c: "red",
	d: "red",
	e: "red"
};

describe("drawDots", () => {
	it("fills each color in one call, skipping markers and hidden songs", () => {
		const { scene, style, fills } = setUp({ alpha: [1, 1, 1, 0, 1] });
		const drawn = drawDots(scene, {
			layers: [Int32Array.from([0, 1, 2, 3, 4])],
			songKeys,
			style,
			fill: (songKey) => fillBySong[songKey]
		});
		expect(drawn).toBe(3);
		expect(fills.map(({ fillStyle, dots }) => [fillStyle, dots])).toEqual([
			["red", 2],
			["blue", 1]
		]);
	});

	it("draws later layers over earlier ones", () => {
		const { scene, style, fills } = setUp();
		drawDots(scene, {
			layers: [Int32Array.from([0, 1]), Int32Array.from([2])],
			songKeys,
			style,
			fill: (songKey) => fillBySong[songKey]
		});
		expect(fills.map(({ fillStyle }) => fillStyle)).toEqual([
			"red",
			"blue",
			"red"
		]);
	});

	it("batches close alphas, draws them at the first one's, and splits distant ones", () => {
		const { scene, style, fills } = setUp({ alpha: [0.9, 0.89, 0.5, 1, 1] });
		drawDots(scene, {
			layers: [Int32Array.from([0, 1, 2])],
			songKeys,
			style,
			fill: () => "red"
		});
		expect(fills).toHaveLength(2);
		expect(fills[0].dots).toBe(2);
		expect(fills[0].globalAlpha).toBeCloseTo(0.72);
		expect(fills[1].globalAlpha).toBeCloseTo(0.4);
	});

	it("culls off-screen dots", () => {
		const { scene, style, fills } = setUp({ x: [0.1, 5, -5, 0.2, 0.3] });
		const drawn = drawDots(scene, {
			layers: [Int32Array.from([0, 1, 2, 3])],
			songKeys,
			style,
			fill: () => "red"
		});
		expect(drawn).toBe(2);
		expect(fills[0].dots).toBe(2);
	});
});

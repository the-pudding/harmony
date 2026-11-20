import { describe, expect, it } from "vitest";
import { drawSongLabel, drawSongMark, type MarkPose } from "./songMark.js";

type Call = { name: string; args: unknown[]; alpha: number; font: string };

const recordingContext = () => {
	const calls: Call[] = [];
	const state = { globalAlpha: 1, font: "" };
	const stack: (typeof state)[] = [];
	const record =
		(name: string) =>
		(...args: unknown[]) => {
			calls.push({
				name,
				args,
				alpha: state.globalAlpha,
				font: state.font
			});
		};
	const context = new Proxy(state, {
		get: (target, key: string) => {
			if (key === "save") return () => stack.push({ ...target });
			if (key === "restore") return () => Object.assign(target, stack.pop());
			if (key === "measureText")
				return (text: string) => ({ width: text.length });
			if (key in target) return target[key as keyof typeof target];
			return record(key);
		},
		set: (target, key: string, value) => {
			(target as Record<string, unknown>)[key] = value;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	return { context, calls };
};

const pose: MarkPose = {
	x: 100,
	y: 50,
	r: 10,
	labelDx: 16,
	labelDy: -14,
	labelPx: 12
};

const lines = [
	[{ role: "title" as const, text: "Holy" }],
	[{ role: "detail" as const, text: "Justin Bieber (2020)" }]
];

const label = {
	lines,
	alpha: 0.5,
	textColor: "white",
	haloColor: "black"
};

describe("drawSongLabel", () => {
	it("puts each line at the label offset from the dot, in its role's font", () => {
		const { context, calls } = recordingContext();
		drawSongLabel(context, pose, label);
		const texts = calls.filter(({ name }) => name === "fillText");
		expect(texts.map(({ args }) => args)).toEqual([
			["Holy", 116, 50 - 14 + 7],
			["Justin Bieber (2020)", 116, 50 - 14 + 14 + 7]
		]);
		expect(texts.map(({ font }) => font.split(" ").slice(0, 2))).toEqual([
			["600", "12px"],
			["400", "10px"]
		]);
		expect(texts.map(({ alpha }) => alpha)).toEqual([0.5, 0.5 * 0.6]);
	});

	it("scales fonts and line height with labelPx", () => {
		const { context, calls } = recordingContext();
		drawSongLabel(context, { ...pose, labelPx: 24 }, label);
		const texts = calls.filter(({ name }) => name === "fillText");
		expect(texts.map(({ font }) => font.split(" ")[1])).toEqual([
			"24px",
			"20px"
		]);
		expect(texts[1].args[2]).toBe(50 - 14 + 1.5 * 28);
	});

	it("ends lines wider than maxWidth in an ellipsis", () => {
		const { context, calls } = recordingContext();
		drawSongLabel(context, pose, { ...label, maxWidth: 10 });
		const texts = calls.filter(({ name }) => name === "fillText");
		expect(texts.map(({ args }) => args[0])).toEqual(["Holy", "Justin Bi…"]);
	});
});

describe("drawSongMark", () => {
	it("draws the dot at the pose, then the label", () => {
		const { context, calls } = recordingContext();
		drawSongMark(context, pose, {
			dot: {
				fill: "red",
				alpha: 0.8,
				glowBlur: 4,
				outlineWidth: 3,
				icon: { kind: "play" }
			},
			label
		});
		const names = calls.map(({ name }) => name);
		const arcs = calls.filter(({ name }) => name === "arc");
		expect(arcs.map(({ args }) => args.slice(0, 3))).toEqual([
			[100, 50, 10],
			[100, 50, 7]
		]);
		expect(names.indexOf("fillText")).toBeGreaterThan(names.lastIndexOf("arc"));
		expect(calls.filter(({ name }) => name === "lineTo")).toHaveLength(2);
	});

	it("skips the label when there is none", () => {
		const { context, calls } = recordingContext();
		drawSongMark(context, pose, {
			dot: {
				fill: "red",
				alpha: 1,
				glowBlur: 0,
				outlineWidth: 3,
				icon: { kind: "none" }
			},
			label: null
		});
		expect(calls.some(({ name }) => name === "fillText")).toBe(false);
	});

	it("draws the playing ring and pause icon at the emphasis alpha", () => {
		const { context, calls } = recordingContext();
		drawSongMark(context, pose, {
			dot: {
				fill: "red",
				alpha: 1,
				glowBlur: 0,
				outlineWidth: 3,
				icon: {
					kind: "playing",
					emphasis: 0.5,
					playback: { progressFraction: 0.25 }
				}
			},
			label: null
		});
		const bars = calls.filter(({ name }) => name === "fillRect");
		expect(bars).toHaveLength(2);
		expect(bars.every(({ alpha }) => alpha === 0.5)).toBe(true);
	});
});

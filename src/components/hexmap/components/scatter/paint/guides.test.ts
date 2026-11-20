import { describe, expect, it } from "vitest";
import { zoomIdentity } from "d3";
import type { Guide } from "$components/storymap/layouts/types.js";
import {
	CHART_BOX_COLOR,
	CHART_BOX_WIDTH,
	CHART_LABEL_COLOR,
	HEX_THEME_COLORS
} from "../constants.js";
import { drawGuides, guideOpacities } from "./guides.js";
import { createScene } from "./scene.js";

describe("guideOpacities", () => {
	it("fades the old set out over the first 30% and the new one in over the last", () => {
		expect(guideOpacities(0)).toEqual({ outgoing: 1, incoming: 0 });
		expect(guideOpacities(0.15).outgoing).toBeCloseTo(0.5);
		expect(guideOpacities(0.3).outgoing).toBe(0);
		expect(guideOpacities(0.5)).toEqual({ outgoing: 0, incoming: 0 });
		expect(guideOpacities(0.85).incoming).toBeCloseTo(0.5);
		expect(guideOpacities(1)).toEqual({ outgoing: 0, incoming: 1 });
	});
});

describe("drawGuides", () => {
	const draw = (opacity: number) => {
		const texts: {
			text: string;
			x: number;
			y: number;
			alpha: number;
			align: string;
		}[] = [];
		const context = {
			globalAlpha: 1,
			textAlign: "left",
			fillText(text: string, x: number, y: number) {
				texts.push({
					text,
					x,
					y,
					alpha: this.globalAlpha,
					align: this.textAlign
				});
			}
		};
		const scene = createScene({
			context: context as unknown as CanvasRenderingContext2D,
			viewport: {
				width: 800,
				height: 600,
				offsetY: 0,
				transform: zoomIdentity
			},
			x: new Float32Array(0),
			y: new Float32Array(0),
			alpha: new Float32Array(0),
			indexOf: new Map(),
			themeColors: HEX_THEME_COLORS.dark
		});
		drawGuides(
			scene,
			[
				{
					guides: [{ kind: "axisLabel", text: "time →", at: "bottom-right" }],
					opacity
				}
			],
			{ top: 100, right: 40, bottom: 48, left: 40 }
		);
		return { texts, context };
	};

	it("puts a bottom-right label near the frame's right edge, in the bottom inset", () => {
		const { texts, context } = draw(0.5);
		expect(texts).toHaveLength(1);
		expect(texts[0]).toMatchObject({
			text: "time →",
			x: 760 - 56,
			y: 552 + 24,
			alpha: 0.5,
			align: "right"
		});
		expect(context.globalAlpha).toBe(1);
	});

	it("skips invisible sets", () => {
		expect(draw(0).texts).toHaveLength(0);
	});
});

describe("drawGuides label and box", () => {
	const draw = (guides: Guide[]) => {
		const texts: {
			text: string;
			x: number;
			y: number;
			align: string;
			fillStyle: string;
			baseline: string;
		}[] = [];
		const boxes: {
			args: number[];
			strokeStyle: string;
			lineWidth: number;
		}[] = [];
		const context = {
			globalAlpha: 1,
			textAlign: "left",
			textBaseline: "alphabetic",
			fillStyle: "",
			strokeStyle: "",
			lineWidth: 1,
			font: "",
			fillText(text: string, x: number, y: number) {
				texts.push({
					text,
					x,
					y,
					align: this.textAlign,
					fillStyle: this.fillStyle,
					baseline: this.textBaseline
				});
			},
			strokeRect(...args: number[]) {
				boxes.push({
					args,
					strokeStyle: this.strokeStyle,
					lineWidth: this.lineWidth
				});
			}
		};
		const scene = createScene({
			context: context as unknown as CanvasRenderingContext2D,
			viewport: {
				width: 800,
				height: 600,
				offsetY: 0,
				transform: zoomIdentity
			},
			x: new Float32Array(0),
			y: new Float32Array(0),
			alpha: new Float32Array(0),
			indexOf: new Map(),
			themeColors: HEX_THEME_COLORS.dark
		});
		// Frame rect: left 40, top 100, 720 wide, 452 tall.
		drawGuides(scene, [{ guides, opacity: 1 }], {
			top: 100,
			right: 40,
			bottom: 48,
			left: 40
		});
		return { texts, boxes, context };
	};

	it("draws a label at its frame position, y up, centered on the line", () => {
		const { texts, context } = draw([
			{ kind: "label", text: "older", x: 0.5, y: 0.25, align: "center" }
		]);
		expect(texts).toEqual([
			{
				text: "older",
				x: 40 + 0.5 * 720,
				y: 100 + 0.75 * 452,
				align: "center",
				fillStyle: CHART_LABEL_COLOR,
				baseline: "middle"
			}
		]);
		expect(context.textBaseline).toBe("alphabetic");
	});

	it("uses a label's own align and color, and leaves the default after", () => {
		const { texts } = draw([
			{
				kind: "label",
				text: "≈1",
				x: 0,
				y: 1,
				align: "right",
				color: "#ff0000",
				weight: "bold"
			},
			{ kind: "axisLabel", text: "after", at: "bottom-left" }
		]);
		expect(texts[0]).toMatchObject({
			x: 40,
			y: 100,
			align: "right",
			fillStyle: "#ff0000"
		});
		expect(texts[1].fillStyle).not.toBe("#ff0000");
		expect(texts[1].baseline).toBe("alphabetic");
	});

	it("strokes a box from its bottom-left corner, y up", () => {
		const { boxes } = draw([
			{ kind: "box", x: 0.25, y: 0.5, width: 0.5, height: 0.25 }
		]);
		expect(boxes).toHaveLength(1);
		expect(boxes[0].strokeStyle).toBe(CHART_BOX_COLOR);
		expect(boxes[0].lineWidth).toBe(CHART_BOX_WIDTH);
		const [x, y, width, height] = boxes[0].args;
		expect(x).toBeCloseTo(40 + 0.25 * 720);
		expect(y).toBeCloseTo(100 + (1 - 0.5 - 0.25) * 452);
		expect(width).toBeCloseTo(360);
		expect(height).toBeCloseTo(113);
	});
});

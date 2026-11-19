import { describe, expect, it } from "vitest";
import { zoomIdentity } from "d3";
import { HEX_THEME_COLORS } from "../constants.js";
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

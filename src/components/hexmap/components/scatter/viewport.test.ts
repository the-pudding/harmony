import { zoomIdentity } from "d3";
import { describe, expect, it } from "vitest";
import {
	HEX_FOCUS_SCALE,
	MIN_ZOOM,
	PAN_EDGE_PADDING,
	PLOT_MARGIN
} from "./constants.js";
import {
	clusterFocusTransform,
	constrainTransform,
	fromBasePixel,
	isOnScreen,
	plotSize,
	toBasePixel,
	toScreen,
	transformCenteredInFrame,
	transformCenteredOn
} from "./viewport.js";

const size = { width: 800, height: 600, offsetY: 0 };

describe("plot coordinates", () => {
	it("maps the plot corners inside the margins, y up", () => {
		expect(toBasePixel(size, { nx: 0, ny: 0 })).toEqual({
			x: PLOT_MARGIN,
			y: size.height - PLOT_MARGIN
		});
		expect(toBasePixel(size, { nx: 1, ny: 1 })).toEqual({
			x: size.width - PLOT_MARGIN,
			y: PLOT_MARGIN
		});
	});

	it("never reports a negative plot size", () => {
		expect(plotSize({ width: 10, height: 10 })).toEqual({
			width: 0,
			height: 0
		});
	});

	it("round-trips through fromBasePixel", () => {
		const position = { nx: 0.3, ny: 0.8 };
		const back = fromBasePixel(size, toBasePixel(size, position));
		expect(back.nx).toBeCloseTo(position.nx);
		expect(back.ny).toBeCloseTo(position.ny);
	});

	it("applies the zoom transform for screen pixels", () => {
		const transform = zoomIdentity.translate(10, 20).scale(2);
		const base = toBasePixel(size, { nx: 0.5, ny: 0.5 });
		expect(toScreen({ ...size, transform }, { nx: 0.5, ny: 0.5 })).toEqual({
			x: base.x * 2 + 10,
			y: base.y * 2 + 20
		});
	});

	it("counts points within the margin as on screen", () => {
		expect(isOnScreen(size, { x: -5, y: 10 })).toBe(false);
		expect(isOnScreen(size, { x: -5, y: 10 }, 5)).toBe(true);
		expect(isOnScreen(size, { x: 800, y: 600 })).toBe(true);
	});
});

describe("centering", () => {
	it("puts the base point at the canvas center, below offsetY", () => {
		const offset = { ...size, offsetY: 40 };
		const t = transformCenteredOn(offset, { x: 100, y: 50 }, 4);
		expect(t.k).toBe(4);
		expect(t.applyX(100)).toBeCloseTo(400);
		expect(t.applyY(50)).toBeCloseTo(300 + 40);
	});

	it("centers in a frame vertically", () => {
		const t = transformCenteredInFrame(
			800,
			{ top: 100, height: 200 },
			{
				x: 10,
				y: 20
			},
			3
		);
		expect(t.applyX(10)).toBeCloseTo(400);
		expect(t.applyY(20)).toBeCloseTo(200);
	});
});

describe("constrainTransform", () => {
	it("leaves an in-bounds transform alone", () => {
		const t = zoomIdentity.translate(0, 0).scale(2);
		expect(constrainTransform(size, t)).toBe(t);
	});

	it("stops the plot from being panned past the padding", () => {
		const t = constrainTransform(size, zoomIdentity.translate(5000, 5000));
		expect(t.x).toBe(PAN_EDGE_PADDING);
		expect(t.y).toBe(PAN_EDGE_PADDING);
	});

	it("measures the top edge from offsetY", () => {
		const t = constrainTransform(
			{ ...size, offsetY: 50 },
			zoomIdentity.translate(0, 5000)
		);
		expect(t.y).toBe(50 + PAN_EDGE_PADDING);
	});
});

describe("clusterFocusTransform", () => {
	const points = [
		{ x: 100, y: 100 },
		{ x: 200, y: 160 }
	];

	it("is null for an empty cluster", () => {
		expect(
			clusterFocusTransform(size, [], { hexMode: false, focusFrame: null })
		).toBeNull();
	});

	it("centers the cluster's box", () => {
		const t = clusterFocusTransform(size, points, {
			hexMode: false,
			focusFrame: null
		})!;
		expect(t.applyX(150)).toBeCloseTo(400);
		expect(t.applyY(130)).toBeCloseTo(300);
		expect(t.k).toBeGreaterThanOrEqual(MIN_ZOOM);
	});

	it("zooms to dot zoom in hex mode without a frame", () => {
		const t = clusterFocusTransform(size, points, {
			hexMode: true,
			focusFrame: null
		})!;
		expect(t.k).toBe(HEX_FOCUS_SCALE);
	});

	it("centers in the frame in hex mode, at least at dot zoom", () => {
		const frame = { top: 300, height: 200 };
		const t = clusterFocusTransform(size, points, {
			hexMode: true,
			focusFrame: frame
		})!;
		expect(t.k).toBeGreaterThanOrEqual(HEX_FOCUS_SCALE);
		expect(t.applyY(130)).toBeCloseTo(400);
	});
});

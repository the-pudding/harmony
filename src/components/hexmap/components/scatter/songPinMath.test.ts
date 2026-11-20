import { describe, expect, it } from "vitest";
import {
	anchorPose,
	createPin,
	idlePlayIconAlpha,
	labelMetrics,
	labelRoom,
	landed,
	poseAt,
	retarget,
	type PinPose
} from "./songPinMath.js";

const pose = (x: number, y: number, r = 10): PinPose => ({
	x,
	y,
	r,
	labelDx: 16,
	labelDy: -14,
	labelPx: 12,
	labelAlpha: 1,
	fill: "#ffffff"
});

describe("poseAt", () => {
	it("starts at the frozen pose and lands on the live target", () => {
		const pin = createPin(pose(0, 0, 3), 1000, 900);
		expect(poseAt(pin, 1000, pose(100, 50))).toEqual(pose(0, 0, 3));
		expect(poseAt(pin, 1450, pose(100, 50))).toEqual(pose(50, 25, 6.5));
		expect(poseAt(pin, 1900, pose(120, 80))).toEqual(pose(120, 80));
		expect(landed(pin, 1899)).toBe(false);
		expect(landed(pin, 1900)).toBe(true);
	});

	it("follows a target that moves mid-trip", () => {
		const pin = createPin(pose(0, 0), 0, 900);
		expect(poseAt(pin, 450, pose(200, 0)).x).toBe(100);
	});

	it("lands at once with no duration", () => {
		const pin = createPin(pose(0, 0), 0, 0);
		expect(landed(pin, 0)).toBe(true);
		expect(poseAt(pin, 0, pose(10, 10))).toEqual(pose(10, 10));
	});

	it("holds its frozen pose through a delay", () => {
		const pin = createPin(pose(0, 0, 3), 1000, 900, 700);
		expect(poseAt(pin, 1700, pose(100, 50))).toEqual(pose(0, 0, 3));
		expect(poseAt(pin, 2150, pose(100, 50))).toEqual(pose(50, 25, 6.5));
		expect(landed(pin, 2599)).toBe(false);
		expect(landed(pin, 2600)).toBe(true);
	});
});

describe("retarget", () => {
	it("freezes the current pose and restarts the clock", () => {
		const pin = createPin(pose(0, 0), 0, 900);
		const moving = { ...pin, current: poseAt(pin, 450, pose(100, 0)) };
		const next = retarget(moving, 450);
		expect(next.from.x).toBe(50);
		expect(next.startMs).toBe(450);
		expect(poseAt(next, 450, pose(0, 300)).x).toBe(50);
	});
});

describe("anchorPose", () => {
	const rect = { left: 100, top: 200, width: 300, height: 40 };

	it("puts the dot at the box's left edge, halfway down, the label beside it", () => {
		const { lineHeight, gap } = labelMetrics(20);
		const target = anchorPose(
			rect,
			{ radius: 10, label: "beside", labelPx: 20, align: "start" },
			{ lineCount: 2, textWidth: 120, fill: "#ffffff" }
		);
		expect(target).toEqual({
			x: 110,
			y: 220,
			r: 10,
			labelDx: 10 + gap,
			labelDy: -lineHeight,
			labelPx: 20,
			labelAlpha: 1,
			fill: "#ffffff"
		});
		expect(labelRoom(rect, target)).toBe(400 - 120 - gap);
	});

	it("centers the dot and its label together", () => {
		const { gap } = labelMetrics(12);
		const target = anchorPose(
			rect,
			{ radius: 10, label: "beside", labelPx: 12, align: "center" },
			{ lineCount: 2, textWidth: 100, fill: "#ffffff" }
		);
		expect(target.x).toBe(100 + (300 - (20 + gap + 100)) / 2 + 10);
	});

	it("hides the label of an unlabeled anchor", () => {
		const target = anchorPose(
			rect,
			{ radius: 7, label: "none", labelPx: 12, align: "center" },
			{ lineCount: 2, textWidth: 100, fill: "#ffffff" }
		);
		expect(target.x).toBe(250);
		expect(target.labelAlpha).toBe(0);
	});
});

describe("idlePlayIconAlpha", () => {
	it("hides the icon at a title's size and shows it at a play button's", () => {
		expect(idlePlayIconAlpha(7)).toBe(0);
		expect(idlePlayIconAlpha(10)).toBe(0);
		expect(idlePlayIconAlpha(18)).toBe(0.5);
		expect(idlePlayIconAlpha(26)).toBe(1);
	});
});

describe("poseAt's fill", () => {
	it("blends from the starting fill to the target's as the mark travels", () => {
		const pin = createPin({ ...pose(0, 0), fill: "#000000" }, 0, 1000);
		const target = { ...pose(100, 0), fill: "#ffffff" };
		expect(poseAt(pin, 0, target).fill).toBe("rgb(0, 0, 0)");
		expect(poseAt(pin, 500, target).fill).toBe("rgb(128, 128, 128)");
		expect(poseAt(pin, 1000, target).fill).toBe("#ffffff");
	});
});

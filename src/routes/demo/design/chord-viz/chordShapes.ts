import {
	curveCardinalClosed,
	curveLinearClosed,
	line,
	type CurveFactory
} from "d3";
import { BLOB_RADIUS } from "./watercolor.js";

export type ChordShape =
	| "stableTriangle"
	| "semiStableTriangle"
	| "unstableTriangle"
	| "circleish"
	| "spikey";

type Point = [number, number];

const SPLINE_TENSION = 0.6;
const FULL_TURN = Math.PI * 2;
const DEGREES_PER_TURN = 360;
const TRIANGLE_VERTEX_COUNT = 3;
const TRIANGLE_STEP = FULL_TURN / TRIANGLE_VERTEX_COUNT;
const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;

const degreesToRadians = (degrees: number): number =>
	(degrees / DEGREES_PER_TURN) * FULL_TURN;

const STABLE_APEX_HALF_SPREAD = degreesToRadians(14);
const STABLE_APEX_RADIUS_SCALE = 0.86;

const UNSTABLE_TIP_RADIUS_SCALE = 1.15;
const UNSTABLE_TIP_SHOULDER_FRACTION = 0.12;
const UNSTABLE_TILT = degreesToRadians(9);
const UNSTABLE_SKEW_X = 4;

const SPIKEY_VERTICES: { radiusScale: number; angleJitter: number }[] = [
	{ radiusScale: 1.05, angleJitter: 0.1 },
	{ radiusScale: 0.38, angleJitter: -0.2 },
	{ radiusScale: 0.82, angleJitter: 0.15 },
	{ radiusScale: 0.5, angleJitter: 0.3 },
	{ radiusScale: 1.1, angleJitter: -0.1 },
	{ radiusScale: 0.32, angleJitter: 0.05 },
	{ radiusScale: 0.7, angleJitter: -0.35 },
	{ radiusScale: 0.45, angleJitter: 0.2 },
	{ radiusScale: 0.95, angleJitter: 0.25 },
	{ radiusScale: 0.3, angleJitter: -0.15 },
	{ radiusScale: 0.88, angleJitter: 0.1 },
	{ radiusScale: 0.55, angleJitter: -0.25 },
	{ radiusScale: 1.0, angleJitter: -0.05 },
	{ radiusScale: 0.36, angleJitter: 0.3 }
];
const SPIKEY_STEP = FULL_TURN / SPIKEY_VERTICES.length;

const shapeLineWith = (curve: CurveFactory) =>
	line<Point>()
		.x(([x]) => x)
		.y(([, y]) => y)
		.curve(curve);

const smoothLine = shapeLineWith(curveCardinalClosed.tension(SPLINE_TENSION));
const jaggedLine = shapeLineWith(curveLinearClosed);

const smoothPathOf = (points: Point[]): string => smoothLine(points) ?? "";
const jaggedPathOf = (points: Point[]): string => jaggedLine(points) ?? "";

const radialPoint = (angle: number, r: number): Point => [
	r * Math.cos(angle),
	r * Math.sin(angle)
];

const lerpPoint = ([ax, ay]: Point, [bx, by]: Point, t: number): Point => [
	ax + (bx - ax) * t,
	ay + (by - ay) * t
];

const rotatePoint = ([x, y]: Point, angle: number): Point => [
	x * Math.cos(angle) - y * Math.sin(angle),
	x * Math.sin(angle) + y * Math.cos(angle)
];

const triangleVerticesAt = (apexAngle: number, apexRadius: number): Point[] =>
	Array.from({ length: TRIANGLE_VERTEX_COUNT }, (_, i) =>
		radialPoint(
			apexAngle + i * TRIANGLE_STEP,
			i === 0 ? apexRadius : BLOB_RADIUS
		)
	);

const roundedApexTrianglePoints = (): Point[] => {
	const [, right, left] = triangleVerticesAt(UP, BLOB_RADIUS);
	const apexRadius = BLOB_RADIUS * STABLE_APEX_RADIUS_SCALE;
	return [
		radialPoint(UP - STABLE_APEX_HALF_SPREAD, apexRadius),
		radialPoint(UP + STABLE_APEX_HALF_SPREAD, apexRadius),
		right,
		left
	];
};

const sharpTipTiltedTrianglePoints = (): Point[] => {
	const [tip, left, right] = triangleVerticesAt(
		DOWN,
		BLOB_RADIUS * UNSTABLE_TIP_RADIUS_SCALE
	);
	const sharpenedOutline: Point[] = [
		tip,
		lerpPoint(tip, left, UNSTABLE_TIP_SHOULDER_FRACTION),
		left,
		right,
		lerpPoint(tip, right, UNSTABLE_TIP_SHOULDER_FRACTION)
	];
	return sharpenedOutline
		.map((point) => rotatePoint(point, UNSTABLE_TILT))
		.map(([x, y]): Point => [x + UNSTABLE_SKEW_X * (y / BLOB_RADIUS), y]);
};

const spikeyPoints = (): Point[] =>
	SPIKEY_VERTICES.map(({ radiusScale, angleJitter }, i) =>
		radialPoint(UP + (i + angleJitter) * SPIKEY_STEP, BLOB_RADIUS * radiusScale)
	);

const SEMI_STABLE_TRIANGLE_POINTS: Point[] = [
	[-8, -BLOB_RADIUS],
	[BLOB_RADIUS - 4, -10],
	[BLOB_RADIUS - 6, BLOB_RADIUS - 8],
	[-BLOB_RADIUS + 4, BLOB_RADIUS - 14],
	[-BLOB_RADIUS + 2, 0]
];

const CIRCLEISH_POINTS: Point[] = [
	[2, -BLOB_RADIUS + 2],
	[BLOB_RADIUS - 4, -BLOB_RADIUS / 2 + 2],
	[BLOB_RADIUS - 2, BLOB_RADIUS / 2 - 2],
	[BLOB_RADIUS / 2 - 4, BLOB_RADIUS - 3],
	[-BLOB_RADIUS / 2, BLOB_RADIUS - 2],
	[-BLOB_RADIUS + 3, BLOB_RADIUS / 2 - 4],
	[-BLOB_RADIUS + 2, -BLOB_RADIUS / 2 + 4],
	[-BLOB_RADIUS / 2 + 2, -BLOB_RADIUS + 2]
];

export const CHORD_SHAPE_PATHS: Record<ChordShape, string> = {
	stableTriangle: smoothPathOf(roundedApexTrianglePoints()),
	semiStableTriangle: smoothPathOf(SEMI_STABLE_TRIANGLE_POINTS),
	unstableTriangle: smoothPathOf(sharpTipTiltedTrianglePoints()),
	circleish: smoothPathOf(CIRCLEISH_POINTS),
	spikey: jaggedPathOf(spikeyPoints())
};

import { curveCardinalClosed, line } from "d3";
import { BLOB_RADIUS } from "./watercolor.js";

export type ChordShape =
	| "stableTriangle"
	| "semiStableTriangle"
	| "unstableTriangle"
	| "circleish"
	| "spikey";

const SPLINE_TENSION = 0.6;
const FULL_TURN = Math.PI * 2;

const SPIKEY_OUTER_RADIUS = BLOB_RADIUS;
const SPIKEY_INNER_RADIUS = BLOB_RADIUS * 0.43;
const SPIKEY_POINT_COUNT = 6;
const SPIKEY_TOTAL_POINTS = SPIKEY_POINT_COUNT * 2;
const START_ANGLE = -Math.PI / 2;

const shapeLine = line<[number, number]>()
	.x(([x]) => x)
	.y(([, y]) => y)
	.curve(curveCardinalClosed.tension(SPLINE_TENSION));

const pathOf = (points: [number, number][]): string => shapeLine(points) ?? "";

const radialPoint = (angle: number, r: number): [number, number] => [
	r * Math.cos(angle),
	r * Math.sin(angle)
];

const trianglePointsAt = (startAngle: number): [number, number][] =>
	Array.from({ length: 3 }, (_, i) =>
		radialPoint(startAngle + i * (FULL_TURN / 3), BLOB_RADIUS)
	);

const spikeyPoints = (): [number, number][] =>
	Array.from({ length: SPIKEY_TOTAL_POINTS }, (_, i) => {
		const angle = START_ANGLE + i * (FULL_TURN / SPIKEY_TOTAL_POINTS);
		const r = i % 2 === 0 ? SPIKEY_OUTER_RADIUS : SPIKEY_INNER_RADIUS;
		return radialPoint(angle, r);
	});

const STABLE_TRIANGLE_POINTS = trianglePointsAt(START_ANGLE);

const SEMI_STABLE_TRIANGLE_POINTS: [number, number][] = [
	[-8, -BLOB_RADIUS],
	[BLOB_RADIUS - 4, -10],
	[BLOB_RADIUS - 6, BLOB_RADIUS - 8],
	[-BLOB_RADIUS + 4, BLOB_RADIUS - 14],
	[-BLOB_RADIUS + 2, 0]
];

const UNSTABLE_TRIANGLE_POINTS = trianglePointsAt(Math.PI / 2);

const CIRCLEISH_POINTS: [number, number][] = [
	[2, -BLOB_RADIUS + 2],
	[BLOB_RADIUS - 4, -BLOB_RADIUS / 2 + 2],
	[BLOB_RADIUS - 2, BLOB_RADIUS / 2 - 2],
	[BLOB_RADIUS / 2 - 4, BLOB_RADIUS - 3],
	[-BLOB_RADIUS / 2, BLOB_RADIUS - 2],
	[-BLOB_RADIUS + 3, BLOB_RADIUS / 2 - 4],
	[-BLOB_RADIUS + 2, -BLOB_RADIUS / 2 + 4],
	[-BLOB_RADIUS / 2 + 2, -BLOB_RADIUS + 2]
];

const SPIKEY_POINTS = spikeyPoints();

export const CHORD_SHAPE_PATHS: Record<ChordShape, string> = {
	stableTriangle: pathOf(STABLE_TRIANGLE_POINTS),
	semiStableTriangle: pathOf(SEMI_STABLE_TRIANGLE_POINTS),
	unstableTriangle: pathOf(UNSTABLE_TRIANGLE_POINTS),
	circleish: pathOf(CIRCLEISH_POINTS),
	spikey: pathOf(SPIKEY_POINTS)
};

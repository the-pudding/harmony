import { polygonContains, randomLcg } from "d3";
import { CHORD_VIZ_ROWS, type VizChord } from "./diatonicChords.js";

export type Point = { x: number; y: number };

export type FloatingChord = VizChord & {
	id: string;
	radius: number;
	start: Point;
};

type Random = () => number;

export const HEX_RADIUS = 200;
const HEX_PADDING = 10;
const SQRT3 = Math.sqrt(3);
export const HEX_HALF_WIDTH = (SQRT3 / 2) * HEX_RADIUS;
const HEX_EDGE_SLOPE = 1 / SQRT3;
const HALF = 0.5;
const VERTICAL_SIDE_CHANCE = 1 / 3;
const EDGE_OFFSET_ANGLE = Math.PI / 3;
const FULL_TURN = Math.PI * 2;

const MIN_CHORD_RADIUS = 20;
const CHORD_RADIUS_RANGE = 20;
const MIN_FLOAT_DURATION = 3000;
const FLOAT_DURATION_RANGE = 4000;
const FLOATING_SEED = 0.42;

export const GOOEY_BLUR = 8;
export const GOOEY_ALPHA_MATRIX =
	"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7";

const HEXAGON_UNIT_POINTS: [number, number][] = [
	[0, -1],
	[SQRT3 / 2, -HALF],
	[SQRT3 / 2, HALF],
	[0, 1],
	[-SQRT3 / 2, HALF],
	[-SQRT3 / 2, -HALF]
];

export const HEXAGON_POINTS: [number, number][] = HEXAGON_UNIT_POINTS.map(
	([x, y]) => [x * HEX_RADIUS, y * HEX_RADIUS]
);

export const HEXAGON_PATH = `M${HEXAGON_POINTS.map((point) => point.join(",")).join("L")}Z`;

export const FLOATING_VIEWBOX = [
	-HEX_RADIUS,
	-HEX_RADIUS - HEX_PADDING,
	2 * HEX_RADIUS,
	2 * (HEX_RADIUS + HEX_PADDING)
].join(" ");

const randomSign = (random: Random): number => (random() > HALF ? 1 : -1);

export const randomPointInside = (radius: number, random: Random): Point => {
	const distance = random() * HEX_RADIUS;
	const angle = random() * FULL_TURN;
	const outerEdge: [number, number] = [
		(distance + radius) * Math.cos(angle),
		(distance + radius) * Math.sin(angle)
	];
	return polygonContains(HEXAGON_POINTS, outerEdge)
		? { x: distance * Math.cos(angle), y: distance * Math.sin(angle) }
		: randomPointInside(radius, random);
};

export const nextFloatingLocation = (
	currentX: number,
	radius: number,
	random: Random = Math.random
): Point => {
	const sideX = currentX > 0 ? -1 : 1;
	const sideY = randomSign(random);

	if (random() < VERTICAL_SIDE_CHANCE) {
		return {
			x: sideX * (HEX_HALF_WIDTH - radius),
			y: sideY * (random() * HALF * HEX_RADIUS - radius)
		};
	}

	const edgeX = sideX * random() * HEX_HALF_WIDTH;
	const edgeY = sideY * (HEX_RADIUS - HEX_EDGE_SLOPE * Math.abs(edgeX));
	return {
		x: edgeX - sideX * radius * Math.cos(EDGE_OFFSET_ANGLE),
		y: edgeY - sideY * radius * Math.sin(EDGE_OFFSET_ANGLE)
	};
};

export const floatDuration = (random: Random = Math.random): number =>
	MIN_FLOAT_DURATION + FLOAT_DURATION_RANGE * random();

const createFloatingChords = (random: Random): FloatingChord[] =>
	CHORD_VIZ_ROWS.flatMap((row) =>
		row.chords.map((chord) => {
			const radius = MIN_CHORD_RADIUS + CHORD_RADIUS_RANGE * random();
			return {
				...chord,
				id: `${row.scale}-${chord.degree}`,
				radius,
				start: randomPointInside(radius, random)
			};
		})
	);

export const FLOATING_CHORDS = createFloatingChords(randomLcg(FLOATING_SEED));

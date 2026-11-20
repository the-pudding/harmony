// Section 4's chart, drawn with the songs themselves: a column per release
// year, each a 100% stack of that year's songs, so every year stands as tall
// as the others whatever its song count. Songs that contain the featured
// progression fill each column from the bottom in its color; everyone else
// stacks above them in a muted gray. The colored area is the progression's
// share of each year's songs (as in tasks/build-charts.ts). Changing the
// progression only reorders songs within their year, so the chart updates
// in place. Songs with no year aren't placed.
import { GUIDE_BOTTOM_RIGHT_CLEARANCE } from "$components/hexmap/components/scatter/constants.js";
import type { SongTable } from "../songTable.js";
import { hashUnit } from "./seededRandom.js";
import {
	PHONE_MAX_FRAME_WIDTH,
	STAR_RADIUS,
	TIMELINE_FIRST_YEAR,
	TIMELINE_LAST_YEAR
} from "./timeline.js";
import type { Guide, Layout, LayoutFrame } from "./types.js";

// Years, end exclusive.
export type YearSpan = { start: number; end: number };

export type ProgressionOverTimeParams = {
	// The progression whose songs fill the bottom of each year; null = none.
	progression: string | null;
	// Its songs' fill.
	color: string;
	// Shaded, with its share of songs over it.
	highlight: YearSpan | null;
};

export const DEFAULT_PROGRESSION_OVER_TIME_PARAMS: ProgressionOverTimeParams = {
	progression: null,
	color: "#f4f4f5",
	highlight: null
};

// Songs without the progression: there, but well behind it.
export const MUTED_SONG_FILL = "rgba(82, 82, 91, 0.45)";

// Room in px, inside the frame, for the % labels on the left and the decade
// labels under the columns; the right side stays clear of the mute button.
const GUTTER_PX = { phone: 36, wide: 48 };
const RIGHT_PX = GUIDE_BOTTOM_RIGHT_CLEARANCE;
const FOOTER_PX = 24;
const LABEL_GAP_PX = 8;
// Between the highlighted decade's tallest stack and its share.
const SHARE_GAP_PX = 18;
// A dot's radius as a share of its cell's shorter side: just touching.
const RADIUS_PER_CELL = 0.5;
const MIN_RADIUS = 1;
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const DECADE_LENGTH = 10;

const YEAR_COUNT = TIMELINE_LAST_YEAR - TIMELINE_FIRST_YEAR + 1;

// Whether the song's coverage lists the progression.
export const containsProgression = (
	songs: SongTable,
	index: number,
	progression: string
): boolean => songs.coverage[index].some(({ name }) => name === progression);

// Song indexes by year column, each in a seeded order that doesn't depend
// on the progression, so songs keep their places relative to their group.
const songsByYear = (songs: SongTable): number[][] => {
	const columns = Array.from({ length: YEAR_COUNT }, () => [] as number[]);
	const tieBreak = new Float64Array(songs.count);
	for (let index = 0; index < songs.count; index++) {
		const year = songs.year[index];
		if (year === 0) continue;
		const column =
			Math.min(TIMELINE_LAST_YEAR, Math.max(TIMELINE_FIRST_YEAR, year)) -
			TIMELINE_FIRST_YEAR;
		columns[column].push(index);
		tieBreak[index] = hashUnit(songs.keys[index], "x");
	}
	for (const members of columns) {
		members.sort((a, b) => tieBreak[a] - tieBreak[b]);
	}
	return columns;
};

const percent = (share: number) => `${Math.round(share * 100)}%`;

export const progressionOverTimeLayout: Layout<ProgressionOverTimeParams> = {
	name: "progressionOverTime",
	framed: true,
	compute: ({ songs, frame }, { progression, color, highlight }) => {
		const phone = frame.width < PHONE_MAX_FRAME_WIDTH;
		const gutter = phone ? GUTTER_PX.phone : GUTTER_PX.wide;
		const plot = {
			x: gutter,
			y: FOOTER_PX,
			width: Math.max(1, frame.width - gutter - RIGHT_PX),
			height: Math.max(1, frame.height - FOOTER_PX)
		};
		const columnWidth = plot.width / YEAR_COUNT;
		const columns = songsByYear(songs);
		// One dot-column count for every year, so dots line up across years;
		// only their row spacing differs. Square cells for the busiest year,
		// so its dots aren't squeezed (the rest get taller cells).
		const busiest = Math.max(1, ...columns.map((members) => members.length));
		const spacing = Math.sqrt((columnWidth * plot.height) / busiest);
		const perRow = Math.max(1, Math.round(columnWidth / spacing));
		const cellWidth = columnWidth / perRow;

		const x = new Float32Array(songs.count).fill(NaN);
		const y = new Float32Array(songs.count).fill(NaN);
		const fill: (string | null)[] = new Array(songs.count).fill(null);
		// Px tops of each year's colored stack, and its share of the year.
		const stackTop = new Float64Array(YEAR_COUNT);
		const matchCount = new Int32Array(YEAR_COUNT);
		let smallestCell = Infinity;
		columns.forEach((members, column) => {
			if (members.length === 0) return;
			const matching: number[] = [];
			const rest: number[] = [];
			for (const index of members) {
				const has =
					progression !== null &&
					containsProgression(songs, index, progression);
				(has ? matching : rest).push(index);
				fill[index] = has ? color : MUTED_SONG_FILL;
			}
			const rows = Math.ceil(members.length / perRow);
			const cellHeight = plot.height / rows;
			smallestCell = Math.min(smallestCell, cellWidth, cellHeight);
			const left = plot.x + column * columnWidth;
			[...matching, ...rest].forEach((index, order) => {
				x[index] = (left + ((order % perRow) + 0.5) * cellWidth) / frame.width;
				y[index] =
					(plot.y + (Math.floor(order / perRow) + 0.5) * cellHeight) /
					frame.height;
			});
			matchCount[column] = matching.length;
			stackTop[column] =
				plot.y + Math.ceil(matching.length / perRow) * cellHeight;
		});

		return {
			name: "progressionOverTime",
			x,
			y,
			framed: true,
			aggregate: "none",
			color: "star",
			fill,
			pointRadius: Math.max(
				MIN_RADIUS,
				Math.min(STAR_RADIUS, smallestCell * RADIUS_PER_CELL)
			),
			guides: [
				...axisGuides(frame, plot, phone),
				...(progression === null
					? []
					: [trendLine(frame, plot, color, { columns, matchCount })]),
				...(highlight
					? highlightGuides(frame, plot, highlight, color, {
							columns,
							matchCount,
							stackTop
						})
					: [])
			]
		};
	}
};

type Plot = { x: number; y: number; width: number; height: number };

// Each year's share of songs with the progression, at its column's
// middle: the old time-series line, along the top of the colored stacks.
// It morphs into the next progression's.
const trendLine = (
	frame: LayoutFrame,
	plot: Plot,
	color: string,
	{ columns, matchCount }: { columns: number[][]; matchCount: Int32Array }
): Guide => ({
	kind: "line",
	id: "progressionOverTime:trend",
	color,
	points: columns.flatMap((members, column) =>
		members.length === 0
			? []
			: [
					{
						x: columnX(plot, TIMELINE_FIRST_YEAR + column + 0.5) / frame.width,
						y:
							(plot.y + (matchCount[column] / members.length) * plot.height) /
							frame.height
					}
				]
	)
});

const columnX = (plot: Plot, year: number) =>
	plot.x + ((year - TIMELINE_FIRST_YEAR) / YEAR_COUNT) * plot.width;

// Ids keep them in place, at full opacity, while the chart updates.
const axisGuides = (
	frame: LayoutFrame,
	plot: Plot,
	phone: boolean
): Guide[] => {
	const ticks = Y_TICKS.map(
		(share): Guide => ({
			kind: "label",
			id: `progressionOverTime:y:${share}`,
			text: percent(share),
			x: (plot.x - LABEL_GAP_PX) / frame.width,
			y: (plot.y + share * plot.height) / frame.height,
			align: "right"
		})
	);
	const decades: Guide[] = [];
	const firstDecade =
		Math.ceil(TIMELINE_FIRST_YEAR / DECADE_LENGTH) * DECADE_LENGTH;
	for (
		let decade = firstDecade;
		decade <= TIMELINE_LAST_YEAR;
		decade += DECADE_LENGTH
	) {
		decades.push({
			kind: "label",
			id: `progressionOverTime:decade:${decade}`,
			text: phone ? `’${String(decade).slice(2)}` : String(decade),
			x: columnX(plot, decade) / frame.width,
			y: FOOTER_PX / 2 / frame.height,
			align: "left"
		});
	}
	return [...ticks, ...decades];
};

// The highlighted years shaded, and their share of songs over their
// tallest stack; both move to the next highlight rather than fading.
const highlightGuides = (
	frame: LayoutFrame,
	plot: Plot,
	{ start, end }: YearSpan,
	color: string,
	{
		columns,
		matchCount,
		stackTop
	}: { columns: number[][]; matchCount: Int32Array; stackTop: Float64Array }
): Guide[] => {
	const first = Math.max(TIMELINE_FIRST_YEAR, start);
	const last = Math.min(TIMELINE_LAST_YEAR + 1, end);
	if (!(last > first)) return [];
	let songCount = 0;
	let matching = 0;
	let top = plot.y;
	for (let year = first; year < last; year++) {
		const column = year - TIMELINE_FIRST_YEAR;
		songCount += columns[column].length;
		matching += matchCount[column];
		top = Math.max(top, stackTop[column]);
	}
	const left = columnX(plot, first);
	const right = columnX(plot, last);
	return [
		{
			kind: "box",
			id: "progressionOverTime:highlight",
			style: "shade",
			x: left / frame.width,
			y: plot.y / frame.height,
			width: (right - left) / frame.width,
			height: plot.height / frame.height
		},
		{
			kind: "label",
			id: "progressionOverTime:highlight:share",
			text: percent(songCount === 0 ? 0 : matching / songCount),
			x: (left + right) / 2 / frame.width,
			y: Math.min(plot.y + plot.height, top + SHARE_GAP_PX) / frame.height,
			align: "center",
			color,
			weight: "bold",
			size: "xlarge",
			layer: "over"
		}
	];
};

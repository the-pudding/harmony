// The "night sky": one still star per song, scattered at random across (and
// a little past) the screen, in no order, some fainter than others. The songs
// the story names (SKY_PINNED_SONGS) are kept clear of the text column, where
// the story text, videos and title card sit, so they're never behind them.
import { SKY_OPENING_SONG, SKY_PINNED_SONGS } from "$data/skySongs.js";
import {
	STAR_ALPHA,
	STAR_FILL_RGB
} from "$components/hexmap/components/scatter/constants.js";
import { hashUnit } from "./seededRandom.js";
import {
	PHONE_MAX_FRAME_WIDTH,
	PHONE_STAR_RADIUS,
	STAR_RADIUS
} from "./timeline.js";
import type { Layout } from "./types.js";

export type SkyParams = Record<string, never>;

// Stars run this far past the frame on every side, so zooming out from the
// opening song never shows where they end.
const SKY_BLEED = 0.15;
// The opening song, which slide 0 zooms in on: centered across, so the sky
// reaches as far either way, and low, below the text, videos and title card.
const OPENING_SPOT: [number, number] = [0.5, 0.17];
const TALL_OPENING_SPOT: [number, number] = [0.5, 0.09];
// A few brightness levels (few, so dots still batch), faint to full.
const STAR_FILLS = [0.4, 0.6, 0.8, 1].map(
	(level) =>
		`rgba(${STAR_FILL_RGB[0]},${STAR_FILL_RGB[1]},${STAR_FILL_RGB[2]},${STAR_ALPHA * level})`
);

// The story's text column (--col-width in app.css), plus a gap to keep
// named songs' dots clear of it, in px.
const TEXT_COLUMN_WIDTH = 550;
const COLUMN_GAP = 40;
// The narrowest side band named songs go in; narrower frames (phones) put
// them along the bottom instead.
const MIN_SIDE_BAND = 60;
// Kept off the frame's very edge, 0–1.
const EDGE = 0.03;

type Band = { x0: number; x1: number; y0: number; y1: number };

// Where named songs go, 0–1 across the frame, y up: down both sides of the
// text column, or, without room there, along the bottom below it.
const namedSongBands = (frameWidth: number): Band[] => {
	const columnEdge =
		0.5 + (TEXT_COLUMN_WIDTH / 2 + COLUMN_GAP) / Math.max(frameWidth, 1);
	const sideWidth = (1 - EDGE - columnEdge) * frameWidth;
	if (sideWidth >= MIN_SIDE_BAND) {
		return [
			{ x0: EDGE, x1: 1 - columnEdge, y0: 0.06, y1: 0.94 },
			{ x0: columnEdge, x1: 1 - EDGE, y0: 0.06, y1: 0.94 }
		];
	}
	return [{ x0: 0.08, x1: 0.92, y0: 0.04, y1: 0.14 }];
};

const spotIn = (bands: Band[], songKey: string): [number, number] => {
	const areas = bands.map(({ x0, x1, y0, y1 }) => (x1 - x0) * (y1 - y0));
	const total = areas.reduce((sum, area) => sum + area, 0);
	let pick = hashUnit(songKey, "sky-band") * total;
	let band = bands[bands.length - 1];
	for (let index = 0; index < bands.length; index++) {
		if (pick < areas[index]) {
			band = bands[index];
			break;
		}
		pick -= areas[index];
	}
	return [
		band.x0 + hashUnit(songKey, "sky-named-x") * (band.x1 - band.x0),
		band.y0 + hashUnit(songKey, "sky-named-y") * (band.y1 - band.y0)
	];
};

export const skyLayout: Layout<SkyParams> = {
	name: "sky",
	framed: true,
	compute: ({ songs, frame }) => {
		const bands = namedSongBands(frame.width);
		const x = new Float32Array(songs.count);
		const y = new Float32Array(songs.count);
		const fill: (string | null)[] = new Array(songs.count).fill(null);
		for (let index = 0; index < songs.count; index++) {
			const songKey = songs.keys[index];
			if (songKey === SKY_OPENING_SONG) {
				[x[index], y[index]] =
					bands.length > 1 ? OPENING_SPOT : TALL_OPENING_SPOT;
				continue;
			}
			if (SKY_PINNED_SONGS.has(songKey)) {
				[x[index], y[index]] = spotIn(bands, songKey);
				continue;
			}
			const span = 1 + SKY_BLEED * 2;
			x[index] = hashUnit(songKey, "sky-x") * span - SKY_BLEED;
			y[index] = hashUnit(songKey, "sky-y") * span - SKY_BLEED;
			fill[index] =
				STAR_FILLS[
					Math.floor(hashUnit(songKey, "sky-glow") * STAR_FILLS.length)
				];
		}
		return {
			name: "sky",
			x,
			y,
			framed: true,
			aggregate: "none",
			color: "star",
			fill,
			pointRadius:
				frame.width < PHONE_MAX_FRAME_WIDTH ? PHONE_STAR_RADIUS : STAR_RADIUS,
			guides: []
		};
	}
};

// The "night sky": one star per song, left to right by release year. Within a
// year the position is a seeded hash of the key (the snapshot has no months).
import { hashUnit } from "./seededRandom.js";
import { yearStagger } from "./stagger.js";
import type { Layout } from "./types.js";

export const TIMELINE_FIRST_YEAR = 1958;
export const TIMELINE_LAST_YEAR = 2026;

// Slightly smaller on phones.
export const STAR_RADIUS = 2.5;
export const PHONE_STAR_RADIUS = 2.25;
export const PHONE_MAX_FRAME_WIDTH = 600;

export type TimelineParams = Record<string, never>;

export const DEFAULT_TIMELINE_PARAMS: TimelineParams = {};

export const timelineLayout: Layout<TimelineParams> = {
	name: "timeline",
	framed: true,
	compute: ({ songs, frame }) => {
		const years = TIMELINE_LAST_YEAR - TIMELINE_FIRST_YEAR + 1;
		const x = new Float32Array(songs.count);
		const y = new Float32Array(songs.count);
		for (let index = 0; index < songs.count; index++) {
			const year = songs.year[index];
			if (year === 0) {
				x[index] = NaN;
				y[index] = NaN;
				continue;
			}
			const clamped = Math.min(
				TIMELINE_LAST_YEAR,
				Math.max(TIMELINE_FIRST_YEAR, year)
			);
			const key = songs.keys[index];
			x[index] = (clamped - TIMELINE_FIRST_YEAR + hashUnit(key, "x")) / years;
			y[index] = hashUnit(key, "y");
		}
		return {
			name: "timeline",
			x,
			y,
			framed: true,
			aggregate: "none",
			color: "star",
			pointRadius:
				frame.width < PHONE_MAX_FRAME_WIDTH ? PHONE_STAR_RADIUS : STAR_RADIUS,
			stagger: yearStagger(songs),
			guides: []
		};
	}
};

// The "night sky": every song a small, identical star, left to right by
// release year. Within its year a song's position is a seeded hash of its
// key, so a year isn't a vertical stripe, and a reload gives the same sky.
// (There are no release months in the snapshot.)
import { hashUnit } from "./seededRandom.js";
import type { Layout } from "./types.js";

export const TIMELINE_FIRST_YEAR = 1958;
export const TIMELINE_LAST_YEAR = 2026;

// Stars stay small and identical; a little smaller on phones, which show
// the same stars in a narrower frame.
export const STAR_RADIUS = 2.5;
export const PHONE_STAR_RADIUS = 2.25;
export const PHONE_MAX_FRAME_WIDTH = 600;

// Stars use this much of the frame's height, centered, so none sit on its
// edges.
const SKY_TOP = 0.04;
const SKY_SPAN = 0.92;

export type TimelineParams = {
	// The text drawn at the bottom right, or null for none.
	axisLabel: string | null;
};

export const DEFAULT_TIMELINE_PARAMS: TimelineParams = {
	axisLabel: "time →"
};

export const timelineLayout: Layout<TimelineParams> = {
	name: "timeline",
	framed: true,
	compute: ({ songs, frame }, { axisLabel }) => {
		const years = TIMELINE_LAST_YEAR - TIMELINE_FIRST_YEAR + 1;
		const x = new Float32Array(songs.count);
		const y = new Float32Array(songs.count);
		for (let index = 0; index < songs.count; index++) {
			const year = songs.year[index];
			if (year === 0) {
				// Undated songs have no place in time; they fade out.
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
			y[index] = SKY_TOP + SKY_SPAN * hashUnit(key, "y");
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
			guides:
				axisLabel === null
					? []
					: [{ kind: "axisLabel", text: axisLabel, at: "bottom-right" }]
		};
	}
};

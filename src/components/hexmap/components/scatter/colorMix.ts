import { rgb } from "d3";
import { COLOR_MIX_STEPS, STAR_ALPHA, STAR_FILL_RGB } from "./constants.js";

// A song's dot fill while it moves between star white and its region color.
// Each song's `mix` (0 = star, 1 = region) is rounded to COLOR_MIX_STEPS
// steps, and the fill strings are cached per song and step, so a frame
// allocates nothing once the colors have been seen and the dots still fall
// into few batches.

const star = (alpha: number) =>
	`rgba(${STAR_FILL_RGB[0]},${STAR_FILL_RGB[1]},${STAR_FILL_RGB[2]},${alpha})`;

export const STAR_FILL = star(STAR_ALPHA);

// The step (0 = star, COLOR_MIX_STEPS = fully region) a mix rounds to.
export const mixStep = (mix: number): number =>
	Math.min(COLOR_MIX_STEPS, Math.max(0, Math.round(mix * COLOR_MIX_STEPS)));

type SongColors = {
	// Region color, as rgb.
	r: number;
	g: number;
	b: number;
	// Fill by step, filled in as they're needed.
	fills: (string | undefined)[];
};

// Makes fill(songKey, step) for steps 1 to COLOR_MIX_STEPS − 1: a color
// between star and the song's region color (regionFill, any CSS color).
// Make a new one when the region colors change. Step 0 is STAR_FILL, and
// the last is the region color itself, which callers take from regionFill.
export const createMixFill = (regionFill: (songKey: string) => string) => {
	const bySong = new Map<string, SongColors>();
	return (songKey: string, step: number): string => {
		let colors = bySong.get(songKey);
		if (colors === undefined) {
			const { r, g, b } = rgb(regionFill(songKey));
			colors = {
				r,
				g,
				b,
				fills: new Array<string | undefined>(COLOR_MIX_STEPS + 1)
			};
			bySong.set(songKey, colors);
		}
		let fill = colors.fills[step];
		if (fill === undefined) {
			const t = step / COLOR_MIX_STEPS;
			const lerp = (from: number, to: number) =>
				Math.round(from + (to - from) * t);
			const alpha =
				Math.round((STAR_ALPHA + (1 - STAR_ALPHA) * t) * 1000) / 1000;
			fill = `rgba(${lerp(STAR_FILL_RGB[0], colors.r)},${lerp(STAR_FILL_RGB[1], colors.g)},${lerp(STAR_FILL_RGB[2], colors.b)},${alpha})`;
			colors.fills[step] = fill;
		}
		return fill;
	};
};

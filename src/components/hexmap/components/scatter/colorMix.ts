import { interpolateRgb, rgb } from "d3";
import { COLOR_MIX_STEPS, STAR_ALPHA, STAR_FILL_RGB } from "./constants.js";

// Dot fill between star white and region color; mix is 0 = star, 1 = region.
// Rounded to COLOR_MIX_STEPS and cached so frames allocate nothing.

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

// fill(songKey, step) for steps 1 to COLOR_MIX_STEPS − 1; callers handle the
// endpoints. Make a new one when region colors change.
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

// fill(from, to, t): a CSS color t (0–1) of the way from one to the other,
// rounded to COLOR_MIX_STEPS and cached, for fills that change between
// layouts.
export const createFillBlend = () => {
	const cache = new Map<string, string>();
	return (from: string, to: string, t: number): string => {
		if (from === to) return to;
		const step = mixStep(t);
		if (step === 0) return from;
		if (step === COLOR_MIX_STEPS) return to;
		const key = `${from}|${to}|${step}`;
		let fill = cache.get(key);
		if (fill === undefined) {
			fill = interpolateRgb(from, to)(step / COLOR_MIX_STEPS);
			cache.set(key, fill);
		}
		return fill;
	};
};

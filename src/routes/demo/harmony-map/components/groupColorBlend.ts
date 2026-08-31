import { colorForGroupName, UNGROUPED_COLOR } from "../progressionGroupColors.js";

export type GroupShare = { groupName: string; share: number };

const hexToRgb = (hex: string): [number, number, number] => {
	const value = hex.replace("#", "");
	return [
		parseInt(value.slice(0, 2), 16),
		parseInt(value.slice(2, 4), 16),
		parseInt(value.slice(4, 6), 16)
	];
};

const mixHexColors = (a: string, b: string, t: number): string => {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b);
	const mix = (from: number, to: number) => Math.round(from + (to - from) * t);
	return `rgb(${mix(ar, br)}, ${mix(ag, bg)}, ${mix(ab, bb)})`;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// How far a boundary's blend bleeds into each of its two neighboring arcs,
// as a fraction of the smaller neighbor's own share — keeps the fade soft
// and prominent without ever eating a whole (small) slice.
const FADE_REACH = 0.35;

// Colors a dot by the mix of core progression groups present in its song:
// a full circle for a single group, or a soft conic blend (a faded pie
// split) proportional to each group's share for a mix of groups.
export const fillStyleForGroupShares = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	shares: readonly GroupShare[]
): string | CanvasGradient => {
	const colored = shares
		.filter((entry) => entry.share > 0)
		.map((entry) => ({
			color: colorForGroupName(entry.groupName),
			share: entry.share
		}));

	if (colored.length === 0) return UNGROUPED_COLOR;
	if (colored.length === 1) return colored[0].color;
	if (typeof context.createConicGradient !== "function") {
		return colored.reduce((best, entry) =>
			entry.share > best.share ? entry : best
		).color;
	}

	const gradient = context.createConicGradient(-Math.PI / 2, x, y);

	let cumulative = 0;
	gradient.addColorStop(0, colored[0].color);
	for (let index = 0; index < colored.length; index++) {
		const current = colored[index];
		cumulative += current.share;
		const next = colored[index + 1];
		if (!next) {
			gradient.addColorStop(1, current.color);
			continue;
		}
		const halfWidth = Math.min(current.share, next.share) * FADE_REACH;
		gradient.addColorStop(clamp01(cumulative - halfWidth), current.color);
		gradient.addColorStop(
			clamp01(cumulative),
			mixHexColors(current.color, next.color, 0.5)
		);
		gradient.addColorStop(clamp01(cumulative + halfWidth), next.color);
	}

	return gradient;
};

export const dominantColorForGroupShares = (
	shares: readonly GroupShare[]
): string => {
	const colored = shares
		.filter((entry) => entry.share > 0)
		.map((entry) => ({
			color: colorForGroupName(entry.groupName),
			share: entry.share
		}));

	if (colored.length === 0) return UNGROUPED_COLOR;
	return colored.reduce((best, entry) =>
		entry.share > best.share ? entry : best
	).color;
};

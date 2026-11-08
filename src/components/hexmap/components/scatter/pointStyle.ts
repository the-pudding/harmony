import {
	scatterPointAlpha,
	type ScatterPointAlphaArgs
} from "../scatterPoint.js";
import {
	NOT_PLAYING_ALPHA,
	OUTLINED_POINT_RADIUS,
	PLAYING_POINT_RADIUS,
	POINT_RADIUS,
	SELECTED_POINT_RADIUS
} from "./constants.js";

export const lerp = (from: number, to: number, t: number): number =>
	from + (to - from) * t;

// Each song's eased spotlight emphasis, from 0 to 1 (spotlit), and how far
// the rest are faded, from 0 (nothing spotlit) to 1.
export type Spotlight = {
	emphasis: ReadonlyMap<string, number>;
	fade: number;
};

export type PointStyle = ReturnType<typeof createPointStyle>;

// How each song is drawn this frame: its size, alpha, and whether it gets
// a ringed, glowing marker.
export const createPointStyle = ({
	spotlight,
	outlinedSongKeys,
	...alphaArgs
}: Omit<ScatterPointAlphaArgs, "songKey"> & {
	spotlight: Spotlight;
	outlinedSongKeys: ReadonlySet<string> | null;
}) => {
	const emphasisFor = (songKey: string): number =>
		spotlight.emphasis.get(songKey) ?? 0;

	const isOutlined = (songKey: string): boolean =>
		outlinedSongKeys?.has(songKey) ?? false;

	// Drawn as a ringed, glowing marker: outlined songs, plus a spotlit (or
	// fading-out) song that isn't outlined.
	const isMarked = (songKey: string): boolean =>
		isOutlined(songKey) || emphasisFor(songKey) > 0;

	// A marker's size when not spotlit. Labels are laid out from it so they
	// stay put as songs are played and stopped.
	const restingRadiusFor = (songKey: string): number =>
		isOutlined(songKey) ? OUTLINED_POINT_RADIUS : POINT_RADIUS;

	const radiusFor = (songKey: string): number => {
		if (isMarked(songKey)) {
			return lerp(
				restingRadiusFor(songKey),
				PLAYING_POINT_RADIUS,
				emphasisFor(songKey)
			);
		}
		if (songKey === alphaArgs.selectedSongKey) return SELECTED_POINT_RADIUS;
		return POINT_RADIUS;
	};

	// scatterPointAlpha, faded further while another song is spotlit.
	const alphaFor = (songKey: string): number =>
		scatterPointAlpha({ songKey, ...alphaArgs }) *
		lerp(1, NOT_PLAYING_ALPHA, spotlight.fade * (1 - emphasisFor(songKey)));

	// Marked songs in a fixed order, for laying out labels.
	const markedInLabelOrder = (): string[] => [
		...new Set([...(outlinedSongKeys ?? []), ...spotlight.emphasis.keys()])
	];

	// Marked songs, most emphasized last, so the spotlit song (and one
	// shrinking back) draws on top.
	const markedInDrawOrder = (): string[] =>
		markedInLabelOrder().sort((a, b) => emphasisFor(a) - emphasisFor(b));

	return {
		emphasisFor,
		isOutlined,
		isMarked,
		restingRadiusFor,
		radiusFor,
		alphaFor,
		markedInLabelOrder,
		markedInDrawOrder
	};
};

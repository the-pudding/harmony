import { SONG_LABEL_STYLE, songLabelLines } from "../../songLabelText.js";
import {
	OUTLINED_LABEL_GAP,
	OUTLINED_LABEL_LINE_HEIGHT,
	OUTLINED_LABEL_PADDING
} from "../constants.js";
import { boxAround, placeMarkerLabels } from "../labelPlacement.js";
import type { PointStyle } from "../pointStyle.js";
import type { Point2D } from "../types.js";
import { isOnScreen } from "../viewport.js";
import { drawnIndexOf, screenOfIndex, type Scene } from "./scene.js";
import { drawSongLabel, measureSongLabel } from "./songMark.js";

export type SongSummary = {
	title: string;
	artists: readonly string[];
	year?: number;
};

// Title and artists beside each on-screen marked song (only those isLabeled
// picks). Placed from each marker's resting size so labels stay put as songs
// are played and stopped; drawn after every marker so none covers a label.
// Pinned songs' labels are placed but not drawn, where their dots will rest
// (restingScreenOf), so a mark travelling back to the map heads straight for
// its label's spot there. Returns each placed label's top-left from its
// song's dot.
export const drawOutlinedSongLabels = (
	scene: Scene,
	{
		style,
		summaries,
		titlePrefix,
		isPrefixed = () => true,
		isLabeled = () => true,
		restingScreenOf = () => null
	}: {
		style: PointStyle;
		summaries: ReadonlyMap<string, SongSummary>;
		// Put before outlined songs' titles.
		titlePrefix: string | null;
		// Which outlined songs get titlePrefix (default: all of them).
		isPrefixed?: (songKey: string) => boolean;
		// Unlabeled songs still keep other labels clear of their markers.
		isLabeled?: (songKey: string) => boolean;
		// Where a song's dot will come to rest, or null if it isn't placed.
		restingScreenOf?: (songKey: string) => Point2D | null;
	}
): Map<string, { labelDx: number; labelDy: number }> => {
	const { context, viewport, themeColors } = scene;
	const songs = style.markedInLabelOrder().flatMap((songKey) => {
		const summary = summaries.get(songKey);
		const index = drawnIndexOf(scene, songKey);
		if (!summary || index === -1) return [];
		const screen =
			(style.isPinned(songKey) ? restingScreenOf(songKey) : null) ??
			screenOfIndex(scene, index);
		const title =
			titlePrefix && style.isOutlined(songKey) && isPrefixed(songKey)
				? `${titlePrefix} ${summary.title}`
				: summary.title;
		const lines = songLabelLines({
			title,
			year: summary.year,
			artists: summary.artists
		});
		return [
			{
				songKey,
				screen,
				alpha: scene.alpha[index],
				radius: style.restingRadiusFor(songKey),
				lines
			}
		];
	});

	const labels = placeMarkerLabels(
		songs
			.filter(
				({ songKey, screen }) =>
					isLabeled(songKey) && isOnScreen(viewport, screen)
			)
			.map((song) => ({
				item: song,
				screen: song.screen,
				radius: song.radius,
				textWidth: measureSongLabel(context, song.lines),
				textHeight: song.lines.length * OUTLINED_LABEL_LINE_HEIGHT
			})),
		{
			obstacles: songs.map(({ screen, radius }) => boxAround(screen, radius)),
			width: viewport.width,
			height: viewport.height,
			gap: OUTLINED_LABEL_GAP,
			padding: OUTLINED_LABEL_PADDING
		}
	);

	const placed = new Map<string, { labelDx: number; labelDy: number }>();
	for (const {
		item: { songKey, screen, alpha, lines },
		box
	} of labels) {
		const offset = {
			labelDx: box.left + OUTLINED_LABEL_PADDING - screen.x,
			labelDy: box.top + OUTLINED_LABEL_PADDING - screen.y
		};
		placed.set(songKey, offset);
		if (style.isPinned(songKey)) continue;
		drawSongLabel(
			context,
			{
				x: screen.x,
				y: screen.y,
				...offset,
				labelPx: SONG_LABEL_STYLE.title.fontSizePx
			},
			{
				lines,
				alpha: style.alphaFor(songKey) * alpha,
				textColor: themeColors.labelText,
				haloColor: themeColors.labelHalo
			}
		);
	}
	return placed;
};

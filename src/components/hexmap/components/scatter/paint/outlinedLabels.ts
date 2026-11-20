import {
	SONG_LABEL_STYLE,
	canvasFontFor,
	songLabelLines,
	type SongLabelLine
} from "../../songLabelText.js";
import {
	OUTLINED_LABEL_GAP,
	OUTLINED_LABEL_LINE_HEIGHT,
	OUTLINED_LABEL_PADDING
} from "../constants.js";
import { boxAround, placeMarkerLabels } from "../labelPlacement.js";
import type { PointStyle } from "../pointStyle.js";
import { isOnScreen } from "../viewport.js";
import { drawnIndexOf, screenOfIndex, type Scene } from "./scene.js";

export type SongSummary = {
	title: string;
	artists: readonly string[];
	year?: number;
};

// Title and artists beside each on-screen marked song (only those isLabeled
// picks). Placed from each marker's resting size so labels stay put as songs
// are played and stopped; drawn after every marker so none covers a label.
export const drawOutlinedSongLabels = (
	scene: Scene,
	{
		style,
		summaries,
		titlePrefix,
		isPrefixed = () => true,
		isLabeled = () => true
	}: {
		style: PointStyle;
		summaries: ReadonlyMap<string, SongSummary>;
		// Put before outlined songs' titles.
		titlePrefix: string | null;
		// Which outlined songs get titlePrefix (default: all of them).
		isPrefixed?: (songKey: string) => boolean;
		// Unlabeled songs still keep other labels clear of their markers.
		isLabeled?: (songKey: string) => boolean;
	}
): void => {
	const { context, viewport, themeColors } = scene;
	const songs = style.markedInLabelOrder().flatMap((songKey) => {
		const summary = summaries.get(songKey);
		const index = drawnIndexOf(scene, songKey);
		if (!summary || index === -1) return [];
		const screen = screenOfIndex(scene, index);
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
				textWidth: measureLines(context, song.lines),
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

	context.textAlign = "left";
	context.textBaseline = "middle";
	context.lineJoin = "round";
	context.lineWidth = 3;
	context.strokeStyle = themeColors.labelHalo;
	context.fillStyle = themeColors.labelText;
	for (const {
		item: { songKey, alpha, lines },
		box
	} of labels) {
		const songAlpha = style.alphaFor(songKey) * alpha;
		const rowY = (row: number) =>
			box.top +
			OUTLINED_LABEL_PADDING +
			(row + 0.5) * OUTLINED_LABEL_LINE_HEIGHT;
		const left = box.left + OUTLINED_LABEL_PADDING;
		lines.forEach((line, index) => {
			let x = left;
			for (const { role, text } of line) {
				context.globalAlpha = songAlpha * SONG_LABEL_STYLE[role].opacity;
				context.font = canvasFontFor(role);
				context.strokeText(text, x, rowY(index));
				context.fillText(text, x, rowY(index));
				x += context.measureText(text).width;
			}
		});
	}
};

// The widest line's width, each segment in its role's font.
const measureLines = (
	context: CanvasRenderingContext2D,
	lines: readonly SongLabelLine[]
): number =>
	Math.max(
		...lines.map((line) =>
			line.reduce((lineWidth, { role, text }) => {
				context.font = canvasFontFor(role);
				return lineWidth + context.measureText(text).width;
			}, 0)
		)
	);

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
import type { Box } from "../types.js";
import { isOnScreen } from "../viewport.js";
import { songScreen, type Scene } from "./scene.js";

export type SongSummary = {
	title: string;
	artists: readonly string[];
	year?: number;
};

// Where a label was drawn, and how far right its hover hint row reaches.
export type OutlinedLabelHitArea = { box: Box; hintRight: number };

// Each on-screen marked song's title, with its artists under it, beside
// its marker (see placeMarkerLabels). Placed fresh each draw from each
// marker's resting size, so labels never cover each other or a marker and
// stay put as songs are played and stopped. Drawn after every marker so
// none covers a label. The hovered label gets a hint row under it.
// Returns where each label was drawn, for hovering and clicking.
export const drawOutlinedSongLabels = (
	scene: Scene,
	{
		style,
		summaries,
		titlePrefix,
		openSongId,
		hoveredLabelSongKey
	}: {
		style: PointStyle;
		summaries: ReadonlyMap<string, SongSummary>;
		// Put before outlined songs' titles.
		titlePrefix: string | null;
		openSongId: string | null;
		hoveredLabelSongKey: string | null;
	}
): Map<string, OutlinedLabelHitArea> => {
	const { context, viewport, themeColors } = scene;
	const songs = style.markedInLabelOrder().flatMap((songKey) => {
		const summary = summaries.get(songKey);
		const screen = songScreen(scene, songKey);
		if (!summary || !screen) return [];
		const title =
			titlePrefix && style.isOutlined(songKey)
				? `${titlePrefix} ${summary.title}`
				: summary.title;
		const lines = songLabelLines({
			title,
			year: summary.year,
			artists: summary.artists
		});
		return [
			{ songKey, screen, radius: style.restingRadiusFor(songKey), lines }
		];
	});

	const labels = placeMarkerLabels(
		songs
			.filter(({ screen }) => isOnScreen(viewport, screen))
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

	const hitAreas = new Map<string, OutlinedLabelHitArea>();
	context.textAlign = "left";
	context.textBaseline = "middle";
	context.lineJoin = "round";
	context.lineWidth = 3;
	context.strokeStyle = themeColors.labelHalo;
	context.fillStyle = themeColors.labelText;
	for (const {
		item: { songKey, lines },
		box
	} of labels) {
		const songAlpha = style.alphaFor(songKey);
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

		// A row shown on hover, below the label's own rows.
		const hint = `👆 ${songKey === openSongId ? "hide" : "show"} chords`;
		context.font = canvasFontFor("title");
		hitAreas.set(songKey, {
			box,
			hintRight: left + context.measureText(hint).width
		});
		if (songKey === hoveredLabelSongKey) {
			context.globalAlpha = songAlpha;
			context.strokeText(hint, left, rowY(lines.length));
			context.fillText(hint, left, rowY(lines.length));
		}
	}
	return hitAreas;
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

import { color as parseColor, interpolateRgb } from "d3";
import {
	SONG_LABEL_STYLE,
	canvasFontFor,
	type SongLabelLine,
	type SongLabelRole
} from "../../songLabelText.js";
import { OUTLINE_COLOR, OUTLINED_LABEL_LINE_HEIGHT } from "../constants.js";

export type Playback = {
	// 0 to 1 through the playing song's clip.
	progressFraction: number;
};

// Where a song's mark stands, in canvas px.
export type MarkPose = {
	// The dot's center and radius.
	x: number;
	y: number;
	r: number;
	// The label's top-left from the dot's center, and its title's font size
	// (its other lines scale with it).
	labelDx: number;
	labelDy: number;
	labelPx: number;
};

export type MarkIcon =
	| { kind: "none" }
	| { kind: "play"; alpha?: number }
	// emphasis (0 to 1) fades the ring and pause icon in.
	| { kind: "playing"; emphasis: number; playback: Playback };

export type DotLook = {
	// Inside the ring.
	fill: string;
	alpha: number;
	glowBlur: number;
	outlineWidth: number;
	icon: MarkIcon;
};

export type LabelLook = {
	lines: readonly SongLabelLine[];
	alpha: number;
	textColor: string;
	haloColor: string;
	// Lines wider than this end in an ellipsis.
	maxWidth?: number;
};

// A white glow, then the song's fill inside a white ring, then its icon.
export const drawSongDot = (
	context: CanvasRenderingContext2D,
	{ x, y, r }: Pick<MarkPose, "x" | "y" | "r">,
	{ fill, alpha, glowBlur, outlineWidth, icon }: DotLook
) => {
	context.save();
	context.globalAlpha = alpha;
	context.save();
	context.beginPath();
	context.arc(x, y, r, 0, Math.PI * 2);
	context.shadowColor = OUTLINE_COLOR;
	context.shadowBlur = glowBlur;
	context.fillStyle = OUTLINE_COLOR;
	context.fill();
	context.restore();

	context.beginPath();
	context.arc(x, y, Math.max(0, r - outlineWidth), 0, Math.PI * 2);
	context.fillStyle = fill;
	context.fill();

	const ink = iconInkFor(fill);
	if (icon.kind === "play") drawPlayIcon(context, x, y, r, icon.alpha ?? 1, ink);
	if (icon.kind === "playing") {
		drawPlaybackRing(context, x, y, r, icon.emphasis, icon.playback, ink);
	}
	context.restore();
};

// Title and artists, each segment in its role's font.
export const drawSongLabel = (
	context: CanvasRenderingContext2D,
	{ x, y, labelDx, labelDy, labelPx }: Omit<MarkPose, "r">,
	{ lines, alpha, textColor, haloColor, maxWidth = Infinity }: LabelLook
) => {
	const scale = labelPx / SONG_LABEL_STYLE.title.fontSizePx;
	const lineHeight = OUTLINED_LABEL_LINE_HEIGHT * scale;
	context.save();
	context.textAlign = "left";
	context.textBaseline = "middle";
	context.lineJoin = "round";
	context.lineWidth = 3;
	context.strokeStyle = haloColor;
	context.globalAlpha = alpha;
	const fillOf = (role: SongLabelRole) => {
		const { textMix } = SONG_LABEL_STYLE[role];
		return textMix === 1
			? textColor
			: interpolateRgb(haloColor, textColor)(textMix);
	};
	lines.forEach((line, row) => {
		const rowY = y + labelDy + (row + 0.5) * lineHeight;
		let left = x + labelDx;
		for (const { role, text } of fitLine(context, line, maxWidth, scale)) {
			context.fillStyle = fillOf(role);
			context.font = canvasFontFor(role, scale);
			context.strokeText(text, left, rowY);
			context.fillText(text, left, rowY);
			left += context.measureText(text).width;
		}
	});
	context.restore();
};

// The widest line's width, each segment in its role's font.
export const measureSongLabel = (
	context: CanvasRenderingContext2D,
	lines: readonly SongLabelLine[],
	labelPx: number = SONG_LABEL_STYLE.title.fontSizePx
): number => {
	const scale = labelPx / SONG_LABEL_STYLE.title.fontSizePx;
	return Math.max(
		0,
		...lines.map((line) =>
			line.reduce((lineWidth, { role, text }) => {
				context.font = canvasFontFor(role, scale);
				return lineWidth + context.measureText(text).width;
			}, 0)
		)
	);
};

const ELLIPSIS = "…";

// The line cut short with an ellipsis where it would pass maxWidth.
const fitLine = (
	context: CanvasRenderingContext2D,
	line: SongLabelLine,
	maxWidth: number,
	scale: number
): SongLabelLine => {
	if (maxWidth === Infinity) return line;
	const fitted: SongLabelLine = [];
	let room = maxWidth;
	for (const segment of line) {
		context.font = canvasFontFor(segment.role, scale);
		const width = context.measureText(segment.text).width;
		if (width <= room) {
			fitted.push(segment);
			room -= width;
			continue;
		}
		const fits = (length: number) =>
			context.measureText(segment.text.slice(0, length).trimEnd() + ELLIPSIS)
				.width <= room;
		let low = 0;
		let high = segment.text.length;
		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			if (fits(middle)) low = middle;
			else high = middle - 1;
		}
		const kept = segment.text.slice(0, low).trimEnd();
		if (kept || fits(0)) fitted.push({ ...segment, text: kept + ELLIPSIS });
		break;
	}
	return fitted;
};

// The whole mark: dot, then label.
export const drawSongMark = (
	context: CanvasRenderingContext2D,
	pose: MarkPose,
	{ dot, label }: { dot: DotLook; label: LabelLook | null }
) => {
	drawSongDot(context, pose, dot);
	if (label) drawSongLabel(context, pose, label);
};

// White on a dark dot, near-black on a light one, so the icon never
// disappears into its dot (the outlined dots are often white).
export const iconInkFor = (fill: string): string => {
	const rgb = parseColor(fill)?.rgb();
	if (!rgb) return "white";
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.6 ? "#18181b" : "white";
};

const drawPlayIcon = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	alpha: number,
	ink: string
) => {
	const size = radius * 0.6;
	context.save();
	context.globalAlpha *= alpha;
	context.fillStyle = ink;
	context.beginPath();
	context.moveTo(x - size * 0.35, y - size * 0.55);
	context.lineTo(x - size * 0.35, y + size * 0.55);
	context.lineTo(x + size * 0.7, y);
	context.closePath();
	context.fill();
	context.restore();
};

// A white ring on the dot's edge filling with the clip's progress, plus a
// pause icon.
const drawPlaybackRing = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	emphasis: number,
	{ progressFraction }: Playback,
	ink: string
) => {
	context.save();
	context.globalAlpha = emphasis;
	const ringRadius = radius - 2;
	const start = -Math.PI / 2;
	const arc = (from: number, to: number, color: string) => {
		context.strokeStyle = color;
		context.beginPath();
		context.arc(
			x,
			y,
			ringRadius,
			start + Math.PI * 2 * from,
			start + Math.PI * 2 * to
		);
		context.stroke();
	};
	context.lineWidth = 4;
	context.lineCap = "butt";
	arc(0, 1, "rgba(0, 0, 0, 0.35)");
	arc(0, progressFraction, "white");
	context.fillStyle = ink;
	const barWidth = radius * 0.2;
	const barHeight = radius * 0.7;
	for (const dx of [-barWidth * 1.1, barWidth * 1.1]) {
		context.fillRect(
			x + dx - barWidth / 2,
			y - barHeight / 2,
			barWidth,
			barHeight
		);
	}
	context.restore();
};

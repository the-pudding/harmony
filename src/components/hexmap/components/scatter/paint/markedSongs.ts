import {
	OUTLINE_COLOR,
	OUTLINE_GLOW_BLUR,
	OUTLINE_WIDTH,
	PLAYING_GLOW_BLUR
} from "../constants.js";
import { lerp, type PointStyle } from "../pointStyle.js";
import type { Point2D } from "../types.js";
import { isOnScreen } from "../viewport.js";
import { songScreen, type Scene } from "./scene.js";

export type ChordColorSegment = {
	startFraction: number;
	endFraction: number;
	chordColor: string;
};

export type Playback = {
	// 0 to 1 through the playing song's clip.
	progressFraction: number;
	chordSegments: readonly ChordColorSegment[];
};

// Marked songs: a white glow, then the song's fill inside a white ring, so
// they stand out from the dots around them. A song that isn't outlined
// grows its ring and glow in with its emphasis. A hovered outlined song
// shows a play icon; the playing one, its progress ring and a pause icon.
export const drawMarkedSongs = (
	scene: Scene,
	{
		style,
		innerFill,
		hoveredSongKey,
		playingSongKey,
		playback
	}: {
		style: PointStyle;
		innerFill: (songKey: string) => string;
		hoveredSongKey: string | null;
		playingSongKey: string | null;
		playback: Playback;
	}
) => {
	const { context, viewport } = scene;
	for (const songKey of style.markedInDrawOrder()) {
		const screen = songScreen(scene, songKey);
		if (!screen) continue;
		const radius = style.radiusFor(songKey);
		const emphasis = style.emphasisFor(songKey);
		const outlined = style.isOutlined(songKey);
		const glowBlur = lerp(
			outlined ? OUTLINE_GLOW_BLUR : 0,
			PLAYING_GLOW_BLUR,
			emphasis
		);
		const outlineWidth = outlined ? OUTLINE_WIDTH : OUTLINE_WIDTH * emphasis;
		if (!isOnScreen(viewport, screen, radius + glowBlur)) continue;
		const alpha = style.alphaFor(songKey);

		context.save();
		context.globalAlpha = alpha;
		context.beginPath();
		context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
		context.shadowColor = OUTLINE_COLOR;
		context.shadowBlur = glowBlur;
		context.fillStyle = OUTLINE_COLOR;
		context.fill();
		context.restore();

		context.globalAlpha = alpha;
		context.beginPath();
		context.arc(
			screen.x,
			screen.y,
			Math.max(0, radius - outlineWidth),
			0,
			Math.PI * 2
		);
		context.fillStyle = innerFill(songKey);
		context.fill();

		if (outlined && songKey === hoveredSongKey && songKey !== playingSongKey) {
			drawPlayIcon(context, screen, radius);
		}
		if (songKey === playingSongKey && emphasis > 0) {
			drawPlaybackRing(context, screen, radius, emphasis, playback);
		}
	}
};

const drawPlayIcon = (
	context: CanvasRenderingContext2D,
	screen: Point2D,
	radius: number
) => {
	const size = radius * 0.6;
	context.save();
	context.fillStyle = "white";
	context.beginPath();
	context.moveTo(screen.x - size * 0.35, screen.y - size * 0.55);
	context.lineTo(screen.x - size * 0.35, screen.y + size * 0.55);
	context.lineTo(screen.x + size * 0.7, screen.y);
	context.closePath();
	context.fill();
	context.restore();
};

// A ring on the dot's edge filling with the clip's progress, colored by
// the chord playing in each stretch (white without chord colors), plus a
// pause icon.
const drawPlaybackRing = (
	context: CanvasRenderingContext2D,
	screen: Point2D,
	radius: number,
	emphasis: number,
	{ progressFraction, chordSegments }: Playback
) => {
	context.save();
	context.globalAlpha = emphasis;
	const ringRadius = radius - 2;
	const start = -Math.PI / 2;
	const arc = (from: number, to: number, color: string) => {
		context.strokeStyle = color;
		context.beginPath();
		context.arc(
			screen.x,
			screen.y,
			ringRadius,
			start + Math.PI * 2 * from,
			start + Math.PI * 2 * to
		);
		context.stroke();
	};
	context.lineWidth = 4;
	context.lineCap = "butt";
	arc(0, 1, "rgba(0, 0, 0, 0.35)");
	if (chordSegments.length === 0) arc(0, progressFraction, "white");
	for (const { startFraction, endFraction, chordColor } of chordSegments) {
		if (startFraction >= progressFraction) break;
		arc(startFraction, Math.min(endFraction, progressFraction), chordColor);
	}
	context.fillStyle = "white";
	const barWidth = radius * 0.2;
	const barHeight = radius * 0.7;
	for (const dx of [-barWidth * 1.1, barWidth * 1.1]) {
		context.fillRect(
			screen.x + dx - barWidth / 2,
			screen.y - barHeight / 2,
			barWidth,
			barHeight
		);
	}
	context.restore();
};

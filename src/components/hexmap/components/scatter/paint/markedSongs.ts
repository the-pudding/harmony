import {
	OUTLINE_GLOW_BLUR,
	OUTLINE_WIDTH,
	OUTLINED_POINT_RADIUS,
	PLAYING_GLOW_BLUR
} from "../constants.js";
import { lerp, type PointStyle } from "../pointStyle.js";
import { isOnScreen } from "../viewport.js";
import { drawnIndexOf, screenOfIndex, type Scene } from "./scene.js";
import { drawSongDot, type MarkIcon, type Playback } from "./songMark.js";

// Marked songs: a white glow, then the song's fill inside a white ring. A
// hovered outlined song shows a play icon; the playing one, its progress
// ring and a pause icon.
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
		const index = drawnIndexOf(scene, songKey);
		if (index === -1) continue;
		const screen = screenOfIndex(scene, index);
		const radius = style.radiusFor(songKey);
		const emphasis = style.emphasisFor(songKey);
		const outlined = style.isOutlined(songKey);
		const size = Math.min(
			1,
			style.restingRadiusFor(songKey) / OUTLINED_POINT_RADIUS
		);
		const glowBlur = lerp(
			outlined ? OUTLINE_GLOW_BLUR * size : 0,
			PLAYING_GLOW_BLUR,
			emphasis
		);
		const outlineWidth = outlined
			? lerp(OUTLINE_WIDTH * size, OUTLINE_WIDTH, emphasis)
			: OUTLINE_WIDTH * emphasis;
		if (!isOnScreen(viewport, screen, radius + glowBlur)) continue;
		const alpha = style.alphaFor(songKey) * scene.alpha[index];
		const iconFor = (): MarkIcon => {
			if (songKey === playingSongKey) {
				return emphasis > 0
					? { kind: "playing", emphasis, playback }
					: { kind: "none" };
			}
			return outlined && songKey === hoveredSongKey
				? { kind: "play" }
				: { kind: "none" };
		};

		drawSongDot(
			context,
			{ x: screen.x, y: screen.y, r: radius },
			{
				fill: innerFill(songKey),
				alpha,
				glowBlur,
				outlineWidth,
				icon: iconFor()
			}
		);
	}
};

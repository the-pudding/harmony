import { easeCubicInOut } from "d3";
import { PLAYING_TWEEN_MS } from "./constants.js";
import { lerp, type Spotlight } from "./pointStyle.js";

type Fade = { from: number; to: number; startedAt: number; durationMs: number };

// Eases song emphasis toward the spotlit song, calling onFrame each step. Not
// reactive. Each song eases on its own clock, so a song fading out keeps its
// pace when the next one is spotlit; fadeOutMs longer than fadeInMs lets
// several overlap.
export const createSpotlightTween = (input: {
	readonly songKey: string | null;
	readonly fadesOthers: boolean;
	readonly fadeInMs?: number;
	readonly fadeOutMs?: number;
	onFrame: () => void;
}) => {
	let spotlight: Spotlight = { emphasis: new Map(), fade: 0 };
	const fades = new Map<string, Fade>();
	let othersFade: Fade = { from: 0, to: 0, startedAt: 0, durationMs: 0 };

	const valueAt = (fade: Fade, now: number) => {
		const progress =
			fade.durationMs <= 0
				? 1
				: Math.min(1, (now - fade.startedAt) / fade.durationMs);
		return lerp(fade.from, fade.to, easeCubicInOut(progress));
	};
	const done = (fade: Fade, now: number) =>
		now - fade.startedAt >= fade.durationMs;

	$effect(() => {
		const target = input.songKey;
		const fadeInMs = input.fadeInMs ?? PLAYING_TWEEN_MS;
		const fadeOutMs = input.fadeOutMs ?? PLAYING_TWEEN_MS;
		const now = performance.now();
		for (const [songKey, fade] of fades) {
			// already on its way out: keep going at its own pace
			if (songKey !== target && fade.to === 0) continue;
			fades.set(songKey, {
				from: valueAt(fade, now),
				to: songKey === target ? 1 : 0,
				startedAt: now,
				durationMs: songKey === target ? fadeInMs : fadeOutMs
			});
		}
		if (target && !fades.has(target)) {
			fades.set(target, {
				from: 0,
				to: 1,
				startedAt: now,
				durationMs: fadeInMs
			});
		}
		othersFade = {
			from: valueAt(othersFade, now),
			to: target && input.fadesOthers ? 1 : 0,
			startedAt: now,
			durationMs: PLAYING_TWEEN_MS
		};

		let frame = 0;
		const step = () => {
			const stepNow = performance.now();
			const emphasis = new Map<string, number>();
			let settled = done(othersFade, stepNow);
			for (const [songKey, fade] of fades) {
				const value = valueAt(fade, stepNow);
				if (!done(fade, stepNow)) settled = false;
				else if (value <= 0) {
					fades.delete(songKey);
					continue;
				}
				if (value > 0) emphasis.set(songKey, value);
			}
			spotlight = { emphasis, fade: valueAt(othersFade, stepNow) };
			input.onFrame();
			if (!settled) frame = requestAnimationFrame(step);
		};
		// Started on the next frame so onFrame's reads aren't tracked here.
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	});

	return {
		get current(): Spotlight {
			return spotlight;
		}
	};
};

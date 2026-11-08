import { easeCubicInOut } from "d3";
import { PLAYING_TWEEN_MS } from "./constants.js";
import { lerp, type Spotlight } from "./pointStyle.js";

// Eases each song's spotlight emphasis, and how far the rest fade, toward
// the spotlit song, from wherever they are (mid-tween included), calling
// onFrame after every step. Not reactive, since onFrame redraws.
export const createSpotlightTween = (input: {
	readonly songKey: string | null;
	onFrame: () => void;
}) => {
	let spotlight: Spotlight = { emphasis: new Map(), fade: 0 };

	$effect(() => {
		const target = input.songKey;
		const from = spotlight;
		const songKeys = new Set([...from.emphasis.keys()]);
		if (target) songKeys.add(target);
		const startedAt = performance.now();

		let frame = 0;
		const step = () => {
			const progress = Math.min(
				1,
				(performance.now() - startedAt) / PLAYING_TWEEN_MS
			);
			const eased = easeCubicInOut(progress);
			spotlight = {
				emphasis: new Map(
					[...songKeys]
						.map((songKey): [string, number] => [
							songKey,
							lerp(
								from.emphasis.get(songKey) ?? 0,
								songKey === target ? 1 : 0,
								eased
							)
						])
						.filter(([, emphasis]) => emphasis > 0)
				),
				fade: lerp(from.fade, target ? 1 : 0, eased)
			};
			input.onFrame();
			if (progress < 1) frame = requestAnimationFrame(step);
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

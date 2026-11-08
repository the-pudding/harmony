import { untrack } from "svelte";
import { easeCubicInOut } from "d3";
import { TWEEN_DURATION_MS } from "./constants.js";
import type { NormalizedPoint, Position } from "./types.js";

// Animates songs from where they're drawn to each new layout's positions,
// calling onFrame after every step. Not reactive: positions change every
// frame, and onFrame does the redrawing. The first layout appears at once.
export const createPositionTween = (input: {
	readonly targets: readonly NormalizedPoint[];
	onFrame: () => void;
}) => {
	let positions = new Map<string, Position>();
	let frame = 0;

	const tweenTo = (targets: readonly NormalizedPoint[]) => {
		cancelAnimationFrame(frame);

		if (positions.size === 0) {
			positions = new Map(
				targets.map((target) => [
					target.songKey,
					{ nx: target.nx, ny: target.ny }
				])
			);
			input.onFrame();
			return;
		}

		const from = new Map(
			targets.map((target): [string, Position] => [
				target.songKey,
				positions.get(target.songKey) ?? { nx: target.nx, ny: target.ny }
			])
		);
		const startedAt = performance.now();

		const step = () => {
			const progress = Math.min(
				1,
				(performance.now() - startedAt) / TWEEN_DURATION_MS
			);
			const eased = easeCubicInOut(progress);
			positions = new Map(
				targets.map((target): [string, Position] => {
					const origin = from.get(target.songKey)!;
					return [
						target.songKey,
						{
							nx: origin.nx + (target.nx - origin.nx) * eased,
							ny: origin.ny + (target.ny - origin.ny) * eased
						}
					];
				})
			);
			input.onFrame();
			if (progress < 1) frame = requestAnimationFrame(step);
		};

		step();
	};

	$effect(() => {
		const targets = input.targets;
		untrack(() => tweenTo(targets));
		return () => cancelAnimationFrame(frame);
	});

	return {
		get positions(): ReadonlyMap<string, Position> {
			return positions;
		}
	};
};

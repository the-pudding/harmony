import {
	ROTATING_LABEL_COUNT,
	ROTATING_LABEL_FADE_MS,
	ROTATING_LABEL_GAP_MS,
	ROTATING_LABEL_HOLD_JITTER_MS,
	ROTATING_LABEL_HOLD_MS,
	ROTATING_LABEL_START_STAGGER_MS
} from "./constants.js";
import type { LabelSpot } from "./types.js";

export type RotatingLabel = LabelSpot & { id: number };

// While enabled, runs ROTATING_LABEL_COUNT independent slots, each showing
// a random spot's label, holding it, removing it (its fade-out plays), and
// refilling. Spots are read when each timer fires, so this only restarts
// when enabled changes.
export const createRotatingLabels = (input: {
	readonly enabled: boolean;
	readonly spots: readonly LabelSpot[];
}) => {
	let labels = $state<RotatingLabel[]>([]);

	$effect(() => {
		if (!input.enabled) {
			labels = [];
			return;
		}
		let nextId = 0;
		const timers = new Set<ReturnType<typeof setTimeout>>();
		const after = (ms: number, run: () => void) => {
			const timer = setTimeout(() => {
				timers.delete(timer);
				run();
			}, ms);
			timers.add(timer);
		};
		const jitteredHold = () =>
			ROTATING_LABEL_HOLD_MS +
			(Math.random() * 2 - 1) * ROTATING_LABEL_HOLD_JITTER_MS;

		// Shows a random label that isn't already up, holds it, removes it,
		// then refills the slot. Retries shortly when nothing is available
		// yet, e.g. while the map is still loading.
		const runSlot = (holdMs: number) => {
			const showing = new Set(labels.map((label) => label.text));
			const options = input.spots.filter((spot) => !showing.has(spot.text));
			if (options.length === 0) {
				after(ROTATING_LABEL_FADE_MS, () => runSlot(holdMs));
				return;
			}
			const label = {
				...options[Math.floor(Math.random() * options.length)],
				id: nextId++
			};
			labels = [...labels, label];
			after(ROTATING_LABEL_FADE_MS + holdMs, () => {
				labels = labels.filter(({ id }) => id !== label.id);
				after(ROTATING_LABEL_FADE_MS + ROTATING_LABEL_GAP_MS, () =>
					runSlot(jitteredHold())
				);
			});
		};

		// First holds are spread evenly across one hold period so the slots
		// swap at different times from the start.
		for (let slot = 0; slot < ROTATING_LABEL_COUNT; slot++) {
			after(slot * ROTATING_LABEL_START_STAGGER_MS, () =>
				runSlot((ROTATING_LABEL_HOLD_MS * (slot + 1)) / ROTATING_LABEL_COUNT)
			);
		}

		return () => {
			for (const timer of timers) clearTimeout(timer);
		};
	});

	return {
		get labels(): readonly RotatingLabel[] {
			return labels;
		}
	};
};

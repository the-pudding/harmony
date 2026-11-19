// =============================================================================
// DEV-ONLY-REMOVE-BEFORE-PUBLISH
//
// INSTRUCTIONS FOR AGENTS / HUMANS: this feature must NOT ship. When the piece
// is being published (or the user asks to "remove dev-only code" / "clean up
// the perf param"), remove ALL of the following, then verify with
// `grep -rn "DEV-ONLY-REMOVE-BEFORE-PUBLISH" src` that nothing is left:
//
//   1. Delete this file (src/utils/perfParam.js).
//   2. src/components/hexmap/components/EmbeddingScatter.svelte (4 spots,
//      each marked "perf meter"):
//        - delete the `import { readPerfParam, createPerfMeter }` line
//        - delete the `perfMeter` / `perfEl` declarations
//        - in `draw()`, delete the timing lines (`perfStart` and the
//          `perfMeter?.record(...)` call) and the `drawnDots` bookkeeping
//        - delete the `{#if perfMeter}<pre class="perf-overlay">` block and
//          its `.perf-overlay` style
//
// What it does: with ?perf=1 in the URL, the main map shows a small overlay
// (top-left) with how long each draw() takes (p50/p95 over the last 120
// frames), frames per second over the last second, and the dots drawn. It
// only changes while frames are being drawn; there is no idle loop.
// =============================================================================

const KEY = "perf";
const RING_SIZE = 120;
// A gap this long means the map was idle, not slow; it's not a frame interval.
const IDLE_GAP_MS = 500;
const TEXT_REFRESH_MS = 200;

export const readPerfParam = () => {
	if (typeof window === "undefined") return false;
	return new URL(window.location.href).searchParams.get(KEY) === "1";
};

const percentile = (sorted, p) =>
	sorted.length === 0
		? 0
		: sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

// Ring buffers of the last RING_SIZE draws' duration and spacing. record()
// is called after every draw; it returns the overlay text when it's due for a
// refresh (so the DOM is touched ~5 times a second) and null otherwise.
export const createPerfMeter = () => {
	const drawMs = new Float64Array(RING_SIZE);
	const intervalMs = new Float64Array(RING_SIZE);
	let count = 0;
	let intervals = 0;
	let lastFrameAt = null;
	let lastTextAt = 0;
	const stamps = [];

	const record = (durationMs, dots, now = performance.now()) => {
		drawMs[count % RING_SIZE] = durationMs;
		count++;
		if (lastFrameAt !== null && now - lastFrameAt < IDLE_GAP_MS) {
			intervalMs[intervals % RING_SIZE] = now - lastFrameAt;
			intervals++;
		}
		lastFrameAt = now;
		stamps.push(now);
		while (stamps.length > 0 && now - stamps[0] > 1000) stamps.shift();

		if (now - lastTextAt < TEXT_REFRESH_MS) return null;
		lastTextAt = now;
		const sorted = Array.from(
			drawMs.subarray(0, Math.min(count, RING_SIZE))
		).sort((a, b) => a - b);
		const gaps = Array.from(
			intervalMs.subarray(0, Math.min(intervals, RING_SIZE))
		).sort((a, b) => a - b);
		return [
			`draw p50 ${percentile(sorted, 0.5).toFixed(1)}ms  p95 ${percentile(sorted, 0.95).toFixed(1)}ms`,
			`frame p50 ${percentile(gaps, 0.5).toFixed(1)}ms  p95 ${percentile(gaps, 0.95).toFixed(1)}ms`,
			`fps ${stamps.length}  dots ${dots}`
		].join("\n");
	};

	return { record };
};

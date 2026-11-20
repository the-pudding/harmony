// =============================================================================
// DEV-ONLY-REMOVE-BEFORE-PUBLISH
//
// Must not ship. Delete this file and everything marked "perf meter" in
// EmbeddingScatter.svelte and "dev layout" in HexMap.svelte (use
// `scene.layout.name` directly), then check
// `grep -rn "DEV-ONLY-REMOVE-BEFORE-PUBLISH" src` finds nothing.
//
// ?perf=1 shows an overlay with draw() and frame timings, fps and dot count.
// ?layout=<name> forces the main map's layout.
// =============================================================================

const KEY = "perf";
const RING_SIZE = 120;
// A longer gap means the map was idle, not slow.
const IDLE_GAP_MS = 500;
const TEXT_REFRESH_MS = 200;

export const readPerfParam = () => {
	if (typeof window === "undefined") return false;
	return new URL(window.location.href).searchParams.get(KEY) === "1";
};

export const readLayoutParam = () => {
	if (typeof window === "undefined") return null;
	return new URL(window.location.href).searchParams.get("layout");
};

const percentile = (sorted, p) =>
	sorted.length === 0
		? 0
		: sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

// record() runs after every draw; it returns overlay text only when due for a
// refresh (about 5 per second), else null.
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

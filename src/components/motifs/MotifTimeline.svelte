<script lang="ts">
	import { onMount } from "svelte";
	import { Tween } from "svelte/motion";
	import { cubicOut, linear } from "svelte/easing";
	import { reducedMotion } from "./motifs";

	let { delay = 400 } = $props();

	const uid = $props.id();
	const W = 126;
	const H = 58;
	const X0 = 6; // y axis
	const X1 = 112; // x axis ends (the arrow tip follows)
	const BASE = 48; // x axis
	const LEVEL = 24; // a flat-ish line: popularity that doesn't change
	const POINTS = 44;

	// gentle, deterministic wobble so it reads as data, not a ruler
	const points = Array.from({ length: POINTS }, (_, i) => {
		const x = X0 + 3 + ((X1 - X0 - 6) * i) / (POINTS - 1);
		const wobble =
			2.2 * Math.sin(i * 0.5 + 1) +
			1.5 * Math.sin(i * 1.3 + 2) +
			0.9 * Math.sin(i * 2.9);
		return [x, LEVEL + wobble] as const;
	});
	const line = points
		.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
		.join(" ");
	const area = `${line} L${points.at(-1)![0].toFixed(1)},${BASE} L${points[0][0].toFixed(1)},${BASE} Z`;

	// axes appear first, then the line draws in
	const axes = new Tween(0, { duration: 450, easing: cubicOut });
	const reveal = new Tween(0, { duration: 1700, easing: linear });

	onMount(() => {
		if (reducedMotion.current) {
			axes.set(1, { duration: 0 });
			reveal.set(1, { duration: 0 });
			return;
		}
		const a = setTimeout(() => axes.set(1), delay);
		const b = setTimeout(() => reveal.set(1), delay + 500);
		return () => {
			clearTimeout(a);
			clearTimeout(b);
		};
	});
</script>

<!-- a tiny time series: axes first, then a flat-ish line + area fill sweeps in -->
<svg viewBox="0 0 {W} {H}" overflow="visible">
	<defs>
		<clipPath id="{uid}-clip">
			<rect x="0" y="0" width={W * reveal.current} height={H} />
		</clipPath>
	</defs>
	<g
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		fill="none"
		opacity={0.7 * axes.current}
	>
		<path d="M{X0},6 V{BASE} H{X1 + 8}" />
		<path d="M{X1 + 3},{BASE - 4} L{X1 + 8},{BASE} L{X1 + 3},{BASE + 4}" />
	</g>
	<g clip-path="url(#{uid}-clip)">
		<path d={area} fill="currentColor" opacity="0.25" />
		<path
			d={line}
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
		/>
	</g>
</svg>

<style>
	svg {
		display: block;
		height: 1.5em;
		width: auto;
		aspect-ratio: 126 / 58;
	}
</style>

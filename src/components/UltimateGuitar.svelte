<script>
	import { base } from "$app/paths";

	let { songs = 3 } = $props();

	const images = [
		{ id: "im-yours", aspect: 622 / 794, rotate: -6, yOff: 0.04, z: 1 },
		{
			id: "dont-stop-believin",
			aspect: 573 / 791,
			rotate: 0,
			yOff: -0.03,
			z: 3
		},
		{ id: "youre-beautiful", aspect: 581 / 788, rotate: 5, yOff: 0.05, z: 2 }
	];
	const FEATURED = "dont-stop-believin";
	const PAD_Y = 24;
	const PAD_X = 72; // keep clear of the 64px left/right tap arrows
	const FLY_OUT = 48; // how far past the edge the outer cards travel when hidden
	const STEP = 0.55; // horizontal offset between cards, as a fraction of card width

	let width = $state(0);
	let height = $state(0);
	let entered = $state(false);

	let single = $derived(+songs === 1);

	let layout = $derived.by(() => {
		const availW = Math.max(width - PAD_X * 2, 0);
		const availH = Math.max(height - PAD_Y * 2, 0);
		const avgAspect =
			images.reduce((sum, d) => sum + d.aspect, 0) / images.length;
		const cardH = Math.min(
			availH * 0.85,
			availW / (avgAspect * (1 + 2 * STEP)) / 1.05
		);
		const dx = cardH * avgAspect * STEP;

		return images.map((d, i) => {
			if (single) {
				if (d.id === FEATURED) {
					// no bottom padding when featured on its own
					const h = Math.min(height - PAD_Y, availW / d.aspect);
					const w = h * d.aspect;
					return {
						w,
						h,
						x: (width - w) / 2,
						y: PAD_Y + (height - PAD_Y - h) / 2,
						rotate: 0,
						opacity: 1
					};
				}
				// fly out to the side it sits on
				const h = cardH;
				const w = h * d.aspect;
				const dir = i < 1 ? -1 : 1;
				return {
					w,
					h,
					x: dir < 0 ? -w - FLY_OUT : width + FLY_OUT,
					y: (height - h) / 2 + h * d.yOff,
					rotate: d.rotate + dir * 20,
					opacity: 0
				};
			}

			const h = cardH;
			const w = h * d.aspect;
			return {
				w,
				h,
				x: width / 2 + (i - 1) * dx - w / 2,
				y: (height - h) / 2 + h * d.yOff,
				rotate: d.rotate,
				opacity: 1
			};
		});
	});

	const transformFor = (pos, i) => {
		if (entered) {
			return `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg)`;
		}
		// start below the stage, tilted, before the intro
		const tilt = (i - 1) * 18 + (i === 1 ? -8 : 0);
		return `translate(${pos.x}px, ${height + 80}px) rotate(${tilt}deg)`;
	};

	$effect(() => {
		// wait for a measured layout + painted start position before flying in
		if (!width || !height || entered) return;
		let frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(() => (entered = true));
		});
		return () => cancelAnimationFrame(frame);
	});
</script>

<div
	class="ultimate-guitar"
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{#if width && height}
		{#each images as d, i (d.id)}
			{@const pos = layout[i]}
			<img
				src="{base}/assets/img/ug-{d.id}.png"
				alt=""
				style:width="{pos.w}px"
				style:height="{pos.h}px"
				style:transform={transformFor(pos, i)}
				style:opacity={entered ? pos.opacity : 0}
				style:z-index={d.z}
				style:transition-delay="{(single ? 0 : i) * 90}ms"
			/>
		{/each}
	{/if}
</div>

<style>
	.ultimate-guitar {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100%;
	}

	img {
		position: absolute;
		top: 0;
		left: 0;
		box-sizing: border-box;
		object-fit: cover;
		transform-origin: center;
		border: 3px solid var(--color-gray-200);
		will-change: transform;
		transition:
			transform 900ms cubic-bezier(0.22, 1, 0.36, 1),
			width 900ms cubic-bezier(0.22, 1, 0.36, 1),
			height 900ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 600ms ease;
	}

	@media (prefers-reduced-motion: reduce) {
		img {
			transition: opacity 300ms ease;
		}
	}
</style>

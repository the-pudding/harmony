<script lang="ts">
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";

	type Direction = "left" | "right" | "up" | "down";

	interface Props {
		debug?: boolean;
		enableKeyboard?: boolean;
		full?: boolean;
		showArrows?: boolean | Direction[];
		disable?: Direction[];
		directions?: Direction[];
		size?: string | string[];
		arrowSize?: string;
		arrowStroke?: string;
		arrowStrokeWidth?: string;
		arrowPosition?: "start" | "center" | "end";
		// Edge tabs (as in the Kevin Bacon story) instead of bare chevrons; a
		// disabled tab is hidden, keeping its box.
		notch?: boolean;
		// Pans the right tab to ask for a press.
		pan?: boolean;
		ontap?: (dir: Direction) => void;
	}

	let {
		debug = false,
		enableKeyboard = false,
		full = false,
		showArrows = false, // boolean or array of directions
		disable = [],
		directions = ["left", "right"],
		size = "64px",
		arrowSize = "48px",
		arrowStroke = "#000",
		arrowStrokeWidth = "2",
		arrowPosition = "center", // start, center, end
		notch = false,
		pan = false,
		ontap
	}: Props = $props();

	let innerHeight = $state<number>();

	const getW = (dir: Direction) =>
		Array.isArray(size) ? size[directions.indexOf(dir)] : full ? "100%" : size;
	const getH = (dir: Direction) =>
		["up", "down"].includes(dir) ? size : full ? "100%" : size;

	const onKeyDown = (e: KeyboardEvent) => {
		const dir = e.key.replace("Arrow", "").toLowerCase() as Direction;
		const hasDir = directions.includes(dir);
		// arrow keys in a text field move its caret (or its own list)
		const target = e.target as HTMLElement | null;
		if (target?.closest?.("input, textarea, select, [contenteditable]")) return;
		if (enableKeyboard && hasDir) {
			e.preventDefault();
			ontap?.(dir);
		}
	};

	let visibleArrows = $derived(
		directions.filter((d) =>
			typeof showArrows === "boolean" ? showArrows : showArrows.includes(d)
		)
	);
</script>

<svelte:window onkeydown={onKeyDown} bind:innerHeight />

<section class:debug style="height: {innerHeight}px;">
	{#each directions as dir}
		<button
			onclick={() => ontap?.(dir)}
			style="width: {getW(dir)}; height: {getH(dir)};"
			aria-label={dir}
			class="{dir} {arrowPosition}"
			class:full
			class:notch
			class:pan={pan && dir === "right"}
			disabled={disable.includes(dir)}
		>
			{#if visibleArrows.includes(dir)}
				<span style="font-size: {arrowSize};">
					{#if dir === "left"}
						<ChevronLeft
							aria-hidden="true"
							color={arrowStroke}
							strokeWidth={arrowStrokeWidth}
						/>
					{:else if dir === "right"}
						<ChevronRight
							aria-hidden="true"
							color={arrowStroke}
							strokeWidth={arrowStrokeWidth}
						/>
					{/if}
				</span>
			{/if}
		</button>
	{/each}
</section>

<style>
	section {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: var(--z-overlay);
		pointer-events: none;
	}

	button {
		position: absolute;
		cursor: pointer;
		background: none;
		border-radius: 0;
		outline: none;
		border: none;
		box-shadow: none;
		pointer-events: auto;
		display: flex;
	}

	button:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}

	/* A tab attached to its screen edge, as in the Kevin Bacon story: a dark
	   plate with a light border, so the chevron stands out over the map. */
	button.notch {
		--bleed: 3px;
		width: calc(40px + var(--bleed)) !important;
		height: 3.5rem !important;
		align-items: center;
		justify-content: center;
		background: var(--color-aubergine, #13051d);
		border: 1px solid var(--color-gray-300);
		color: #fff;
	}

	button.notch.left {
		left: calc(-1 * var(--bleed));
		padding-left: var(--bleed);
		border-left: none;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	button.notch.right {
		right: calc(-1 * var(--bleed));
		padding-right: var(--bleed);
		border-right: none;
		border-radius: var(--radius-md) 0 0 var(--radius-md);
	}

	button.notch:disabled {
		opacity: 1;
		visibility: hidden;
	}

	button.notch:not(:disabled):hover {
		background: oklch(0.106 0.053 309.2);
	}

	button.notch span {
		display: flex;
		width: 1.25rem;
		height: 1.25rem;
		font-size: 1.25rem !important;
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		button.notch.pan {
			animation: notch-pan 2.6s ease-in-out infinite;
		}
	}

	@keyframes notch-pan {
		0%,
		100% {
			translate: 0 0;
		}
		25% {
			translate: calc(-1 * var(--bleed)) 0;
		}
		75% {
			translate: var(--bleed) 0;
		}
	}

	/* button:hover {
		background-color: rgba(255, 255, 255, 0.2);
	} */

	.left {
		left: 0;
		top: 0;
		/* text-align: left; */
	}

	.right {
		right: 0;
		top: 0;
		/* text-align: right; */
	}

	.left.start,
	.right.start {
		align-items: flex-start;
	}

	.left.center,
	.right.center {
		top: 50%;
		transform: translateY(-50%);
	}

	.left.end,
	.right.end {
		bottom: 0;
		top: auto;
	}

	.up {
		top: 0;
		left: 0;
		/* text-align: center; */
	}

	.down {
		bottom: 0;
		left: 0;
		/* text-align: center; */
	}

	.up.center,
	.down.center {
		left: 50%;
		transform: translateX(-50%);
	}

	.up.end,
	.down.end {
		right: 0;
		left: auto;
	}

	/* full positions */
	.full.left.start,
	.full.right.start {
		align-items: flex-start;
	}

	.full.left.center,
	.full.right.center {
		align-items: center;
	}

	.full.left.end,
	.full.right.end {
		align-items: flex-end;
	}

	.full.up.start,
	.full.down.start {
		justify-content: flex-start;
	}

	.full.up.center,
	.full.down.center {
		justify-content: center;
	}

	.full.up.end,
	.full.down-end {
		justify-content: flex-end;
	}

	span {
		display: inline-block;
		line-height: 1;
		opacity: 0.5;
	}

	.debug .left {
		background: red;
		opacity: 0.5;
	}

	.debug .right {
		background: red;
		opacity: 0.5;
	}

	.debug .up {
		background: orange;
		opacity: 0.5;
	}

	.debug .down {
		background: orange;
		opacity: 0.5;
	}
</style>

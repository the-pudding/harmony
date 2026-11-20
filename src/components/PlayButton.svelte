<script>
	import playSvg from "$svg/play.svg";

	// progress (0–1) fills a ring around the button while playing
	let { paused = true, progress = 0, label, onclick } = $props();
</script>

<button
	class="play"
	class:playing={!paused}
	style:--progress={progress}
	aria-label="{paused ? 'Play' : 'Pause'}{label ? ` ${label}` : ''}"
	{onclick}
>
	<span class="circle">
		{#if paused}
			<span class="icon">{@html playSvg}</span>
		{:else}
			<svg class="icon" viewBox="0 0 256 256" fill="currentColor">
				<rect x="48" y="32" width="56" height="192" rx="14" />
				<rect x="152" y="32" width="56" height="192" rx="14" />
			</svg>
		{/if}
	</span>
</button>

<style>
	button.play {
		display: flex;
		flex-shrink: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-gray-50, #fff);
		cursor: pointer;
	}

	.circle {
		--size: 3.25rem;
		--ring: 3px;
		position: relative;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #09090b;
		background: var(--color-gray-50, #fff);
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.12);
		transition:
			transform 0.15s ease,
			box-shadow 0.2s ease;
	}

	.circle::before {
		content: "";
		position: absolute;
		inset: calc(var(--ring) * -2);
		border-radius: 50%;
		background: conic-gradient(
			var(--color-gray-50, #fff) calc(var(--progress) * 360deg),
			transparent 0
		);
		mask: radial-gradient(
			farthest-side,
			transparent calc(100% - var(--ring)),
			#000 calc(100% - var(--ring) + 0.5px)
		);
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	button.play.playing .circle::before {
		opacity: 1;
	}

	button.play.playing .circle {
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
	}

	button.play:hover .circle {
		transform: scale(1.06);
		box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.18);
	}

	button.play:active .circle {
		transform: scale(0.97);
	}

	.icon {
		display: flex;
		width: 1.25rem;
		height: 1.25rem;
	}

	.icon :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>

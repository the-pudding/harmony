<script>
	import Header from "$components/Header.svelte";
	import HexMap from "$components/HexMap.svelte";

	let { hed, byline } = $props();
</script>

<div class="background" aria-hidden="true">
	<HexMap
		zoomable={false}
		pannable={false}
		interactive={false}
		showLabels={false}
		showRotatingLabels={true}
		theme="light"
	/>
</div>

<div class="blur">
	<div class="landing">
		<Header />

		<h1>{@html hed}</h1>

		<div class="byline">{@html byline}</div>

		<div class="buttons">
			<button class="audio">Start with audio</button>
			<button class="muted">Stay muted</button>
		</div>
	</div>
</div>

<style>
	.background {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}

	.blur {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(1px);
		-webkit-backdrop-filter: blur(1px);
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}

	.landing {
		max-width: var(--col-width);
		margin: 0 auto;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
	}

	h1 {
		font-weight: bold;
		margin: 0 auto;
		text-align: center;
	}
</style>

<script>
	import Header from "$components/Header.svelte";

	let { hed, byline } = $props();
</script>

<div class="landing-root">
	<div class="content frosted" style="--blur: 2px">
		<div class="header">
			<Header />
		</div>

		<div class="text">
			<h1>{@html hed}</h1>

			<div class="byline">{@html byline}</div>

			<div class="buttons">
				<button class="audio">Start with audio</button>
				<button class="muted">Stay muted</button>
			</div>
		</div>
	</div>
</div>

<style>
	.landing-root {
		max-width: var(--col-width);
		height: 100%;
		margin: 0 auto;
		padding: clamp(0.5rem, 4cqh, 2rem) 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.content {
		width: 100%;
		min-height: 0;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.header {
		flex: none;
		width: 100%;
	}

	.header :global(header) {
		height: clamp(4rem, 22cqh, 10rem);
	}

	.header :global(.wordmark) {
		padding: clamp(4px, 3cqh, 32px) 0;
	}

	.text {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.5rem, 4cqh, 2rem);
		min-height: 0;
	}

	h1 {
		font-weight: bold;
		margin: 0 auto;
		text-align: center;
		font-size: clamp(1.5rem, min(7cqh, 9cqw), var(--48px, 48px));
		line-height: 1.1;
	}

	.byline {
		text-align: center;
		font-size: clamp(0.75rem, 3cqh, 1rem);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.buttons button {
		font-size: clamp(0.75rem, 3cqh, 1rem);
	}
</style>

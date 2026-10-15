<script>
	import Header from "$components/Header.svelte";

	let { hed, byline } = $props();
</script>

<div class="landing-root">
	<div class="blur">
		<div class="landing">
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
</div>

<style>
	.landing-root {
		position: relative;
		height: 100%;
	}

	.blur {
		background: rgba(0, 0, 0, 0.4);
		position: absolute;
		inset: 0;
		overflow: hidden;
		/* size everything inside relative to the stage's height */
		container-type: size;
	}

	.landing {
		max-width: var(--col-width);
		height: 100%;
		margin: 0 auto;
		padding: clamp(0.5rem, 4cqh, 2rem) 1rem;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(0.5rem, 4cqh, 2rem);
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
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
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

	/* short + wide (e.g. landscape phone): put the wordmark beside the text */
	@container (max-height: 420px) and (min-width: 520px) {
		.landing {
			max-width: calc(var(--col-width) + 12rem);
			flex-direction: row;
		}

		.header {
			width: auto;
		}

		.header :global(header) {
			height: clamp(4rem, 50cqh, 10rem);
		}

		.text {
			align-items: flex-start;
		}

		h1,
		.byline {
			text-align: left;
		}

		.buttons {
			justify-content: flex-start;
		}
	}

	/* very short: drop the wordmark entirely */
	@container (max-height: 260px) {
		.header {
			display: none;
		}
	}
</style>

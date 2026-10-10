<script>
	let { videoId, caption } = $props();
</script>

<figure>
	<video src="assets/video/{videoId}.mp4" controls={true}></video>

	{#if caption}
		<figcaption class="caption">
			"{@html caption}"
		</figcaption>
	{/if}
</figure>

<style>
	figure {
		height: 100%;
		max-width: var(--col-width);
		margin: 0 auto;
		padding: 2rem 1rem;
		display: grid;
		grid-template-rows: minmax(180px, auto) auto;
		align-content: start;
		gap: 1rem;
	}

	video {
		display: block;
		justify-self: center;
		max-width: 100%;
		max-height: 100%;
		border-radius: 12px;
	}

	.caption {
		font-size: clamp(1rem, 3.5svh, var(--32px));
		font-style: italic;
	}
</style>

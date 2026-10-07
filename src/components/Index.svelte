<script>
	import Tap from "$components/helpers/Tap.svelte";
	import Slider from "$components/helpers/Slider.svelte";
	import Slide from "$components/helpers/Slider.Slide.svelte";
	import copy from "$data/copy.json";

	let sliderEl;
	let slideI = $state(0);

	const onTap = (dir) => {
		if (dir === "right") sliderEl.next();
		else if (dir === "left") sliderEl.prev();
	};
</script>

<Tap ontap={onTap} full size={["50%", "50%"]} enableKeyboard={true} />

<article>
	<Slider bind:this={sliderEl} bind:current={slideI} duration="0">
		<Slide index={0}>
			<div class="slide-content landing">
				<h1>{copy.hed}</h1>

				<div class="byline">{@html copy.byline}</div>

				<div class="buttons">
					<button class="audio">Start with audio</button>
					<button class="muted">Stay muted</button>
				</div>
			</div>
		</Slide>

		{#each copy.slides as slide, i}
			<Slide index={i + 1}>
				<div class="slide-content">
					{#each slide.text as { value }}
						<p>{@html value}</p>
					{/each}
				</div>
			</Slide>
		{/each}
	</Slider>
</article>

<style>
	article {
		height: calc(100svh - var(--header-height));
		pointer-events: none;
	}

	.landing {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 2rem;
	}

	.slide-content {
		max-width: 550px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	article
		:global(
			:is(
				a,
				button,
				input,
				select,
				textarea,
				audio,
				[tabindex]:not([tabindex="-1"])
			)
		) {
		pointer-events: auto;
	}

	h1 {
		font-weight: bold;
		margin: 0 auto;
		text-align: center;
	}
</style>

<script>
	let { activeSlide, sections, visible = true, onselect } = $props();
</script>

<div class="chapters" class:visible>
	{#each sections as { title, slides }, i}
		{@const chapterActive = slides.some((s) => s.i === activeSlide)}
		<div class="chapter" class:active={chapterActive}>
			<button class="text" onclick={() => onselect?.(slides[0].i)}>
				{i + 1}<span class="title"> — {title}</span>
			</button>
			{#if chapterActive}
				{#each slides as slide, j}
					{@const active = slide.i === activeSlide}
					<button
						class="block"
						class:active
						aria-label="Slide {j + 1} of {title}"
						aria-current={active ? "step" : undefined}
						onclick={() => onselect?.(slide.i)}
					></button>
				{/each}
			{:else}
				<button
					class="block"
					aria-label="Go to chapter {i + 1}: {title}"
					onclick={() => onselect?.(slides[0].i)}
				></button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.chapters {
		/* sit above .text's blur, which feathers up into this area */
		position: relative;
		z-index: 1;
		flex: none;
		display: flex;
		width: 100%;
		justify-content: space-between;
		padding: 0.8rem 1rem 0 1rem;
		opacity: 0;
		transition: opacity 0.3s;
	}
	.chapters.visible {
		opacity: 1;
	}
	.chapter {
		position: relative;
		display: flex;
		align-items: end;
		flex: 1;
		margin: 0 3px;
		/* room for the label above the blocks */
		padding-top: 1.2rem;
	}
	.chapter:first-of-type {
		margin-left: 0;
	}
	.chapter:last-of-type {
		margin-right: 0;
	}
	.chapter.active {
		flex: 5;
	}
	button {
		padding: 0;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.text {
		position: absolute;
		top: 0;
		left: 0;
		font-size: 12px;
		white-space: nowrap;
		background: none;
		opacity: 0.3;
	}
	.text:hover {
		background: none;
		color: inherit;
		opacity: 0.6;
	}
	.title {
		display: none;
	}
	.chapter.active .title {
		display: inline;
	}
	.block {
		position: relative;
		flex: 1;
		height: 2px;
		border-radius: 1px;
		margin: 0 1px;
		background: var(--color-fg);
		opacity: 0.3;
		transition: opacity calc(var(--1s) * 0.4);
	}
	/* the bar is only 2px tall, so extend the hit area around it */
	.block::before {
		content: "";
		position: absolute;
		inset: -8px -1px;
	}
	.block:hover {
		background: var(--color-fg);
		opacity: 0.6;
	}
	.block:first-of-type {
		margin-left: 0;
	}
	.block:last-of-type {
		margin-right: 0;
	}
	.block.active,
	.chapter.active .text {
		opacity: 1;
	}

	@media (max-width: 600px) {
		.text {
			font-size: 10px;
		}
	}
</style>

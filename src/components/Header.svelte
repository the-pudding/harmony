<script lang="ts">
	// shadow, plain, line, bubble
	import wordmark from "$svg/wordmark-script-stacked-sticker.svg";
</script>

<header>
	<div class="wordmark">
		<a href="https://pudding.cool" aria-label="The Pudding" target="_self"
			>{@html wordmark}</a
		>
		<strong>presents...</strong>
	</div>
</header>

<style>
	header {
		position: relative;
		z-index: var(--z-top);
		height: var(--header-height);
	}

	.wordmark {
		height: 100%;
		padding: 32px 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 4px;
	}

	strong {
		font-size: var(--14px);
		transform: translateY(-100%);
	}

	.wordmark a {
		border: none;
		display: block;
		height: 100%;
		color: var(--color-fg);
	}

	:global(.wordmark svg) {
		height: 100%;
	}

	.wordmark a:hover {
		background-color: transparent;
	}
</style>

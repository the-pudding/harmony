<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import DemoSection from "../shared/DemoSection.svelte";
	import ChordViz from "./chord-viz/ChordViz.svelte";
	import DiatonicChordsPanel from "./chord-viz/DiatonicChordsPanel.svelte";
	import FloatingChords from "./chord-viz/FloatingChords.svelte";

	const PAGE_BACKGROUND = "#000000";
	const PAGE_FOREGROUND = "#f4f4f5";

	$effect(() => {
		const previousBackground = document.body.style.backgroundColor;
		document.body.style.backgroundColor = PAGE_BACKGROUND;
		return () => {
			document.body.style.backgroundColor = previousBackground;
		};
	});
</script>

<svelte:head>
	<title>harmony — design</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div
	class="page"
	style="--top-nav-height: {TOP_NAV_HEIGHT}; --page-background: {PAGE_BACKGROUND}; --page-foreground: {PAGE_FOREGROUND};"
>
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Design</h1>
		</div>

		<DemoSection title="Diatonic chords">
			<DiatonicChordsPanel />
		</DemoSection>
		<DemoSection title="Chord viz">
			<ChordViz />
			<FloatingChords />
		</DemoSection>
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page :global(.top-nav) {
		background: var(--page-background);
	}

	.page {
		background: var(--page-background);
		color: var(--page-foreground);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 80rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: var(--page-foreground);
	}
</style>

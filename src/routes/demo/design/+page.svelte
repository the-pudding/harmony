<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import TabList from "../shared/TabList.svelte";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import ChordViz from "./chord-viz/ChordViz.svelte";
	import DiatonicChordsPanel from "./chord-viz/DiatonicChordsPanel.svelte";
	import FloatingChords from "./chord-viz/FloatingChords.svelte";
	import DesignSection from "./DesignSection.svelte";
	import SyncedSongDemo from "./SyncedSongDemo.svelte";
	import SyncedSongRecorder from "./SyncedSongRecorder.svelte";
	import {
		DESIGN_TAB_CHORD_VIZ,
		DESIGN_TAB_DEMOS,
		DESIGN_TAB_LABELS,
		DESIGN_TAB_SYNCED_SONG_PLAYER,
		DESIGN_TABS,
		type DesignTab
	} from "./designTabs.js";
	import { readDesignTab, replaceTabInUrl } from "./designUrlState.js";
	import type { PageProps } from "./$types.js";

	let { data }: PageProps = $props();

	const TAB_ID_PREFIX = "design";
	const PURE_BLACK = "#000000";
	const NEAR_BLACK = "#09090b";
	const PAGE_FOREGROUND = "#f4f4f5";

	let tab = $state(readDesignTab(currentSearchParams()));
	const isChordVizTab = $derived(tab === DESIGN_TAB_CHORD_VIZ);
	const pageBackground = $derived(isChordVizTab ? PURE_BLACK : NEAR_BLACK);

	function selectTab(next: DesignTab) {
		tab = next;
		replaceTabInUrl(next);
	}

	$effect(() => {
		if (!isChordVizTab) return;
		const previousBackground = document.body.style.backgroundColor;
		document.body.style.backgroundColor = PURE_BLACK;
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
	class:chord-viz-page={isChordVizTab}
	style="--top-nav-height: {TOP_NAV_HEIGHT}; --page-background: {pageBackground}; --page-foreground: {PAGE_FOREGROUND};"
>
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Design</h1>
		</div>

		<TabList
			tabs={DESIGN_TABS}
			labels={DESIGN_TAB_LABELS}
			{tab}
			idPrefix={TAB_ID_PREFIX}
			ariaLabel="Design views"
			onselect={selectTab}
		/>

		<div
			class="tab-panel"
			role="tabpanel"
			id="{TAB_ID_PREFIX}-panel-{tab}"
			aria-labelledby="{TAB_ID_PREFIX}-tab-{tab}"
		>
			{#if tab === DESIGN_TAB_DEMOS}
				<DesignSection title="Synced song player">
					<SyncedSongDemo />
				</DesignSection>
				<DesignSection title="Chord viz">
					<DiatonicChordsPanel />
				</DesignSection>
			{:else if tab === DESIGN_TAB_SYNCED_SONG_PLAYER}
				<DesignSection title="Record sync">
					<SyncedSongRecorder audioOptions={data.syncedSongAudio} />
				</DesignSection>
			{:else if tab === DESIGN_TAB_CHORD_VIZ}
				<DesignSection title="Chord viz">
					<ChordViz />
					<FloatingChords />
				</DesignSection>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page.chord-viz-page :global(.top-nav) {
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

	.tab-panel {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: var(--page-foreground);
	}
</style>

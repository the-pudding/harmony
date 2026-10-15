<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import TabList from "../shared/TabList.svelte";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import ChordViz from "./chord-viz/ChordViz.svelte";
	import DiatonicChordsPanel from "./chord-viz/DiatonicChordsPanel.svelte";
	import FloatingChords from "./chord-viz/FloatingChords.svelte";
	import DesignSection from "./DesignSection.svelte";
	import SyncedSongPlayer from "./SyncedSongPlayer.svelte";
	import { rubberBall } from "./designSongs.js";
	import {
		DESIGN_TAB_CHORD_VIZ,
		DESIGN_TAB_DEMOS,
		DESIGN_TAB_LABELS,
		DESIGN_TAB_SYNCED_SONG_PLAYER,
		DESIGN_TABS,
		type DesignTab
	} from "./designTabs.js";
	import { readDesignTab, replaceTabInUrl } from "./designUrlState.js";

	const TAB_ID_PREFIX = "design";

	let tab = $state(readDesignTab(currentSearchParams()));

	function selectTab(next: DesignTab) {
		tab = next;
		replaceTabInUrl(next);
	}
</script>

<svelte:head>
	<title>harmony — design</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
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
					<SyncedSongPlayer song={rubberBall} />
				</DesignSection>
				<DesignSection title="Chord viz">
					<DiatonicChordsPanel />
				</DesignSection>
			{:else if tab === DESIGN_TAB_SYNCED_SONG_PLAYER}
				<DesignSection title="Synced song player">
					<SyncedSongPlayer song={rubberBall} editing />
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

	.page {
		background: #09090b;
		color: #f4f4f5;
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
		color: #f4f4f5;
	}
</style>

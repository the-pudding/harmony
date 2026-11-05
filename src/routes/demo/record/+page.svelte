<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import DemoSection from "../shared/DemoSection.svelte";
	import TabList from "../shared/TabList.svelte";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import ClusterIdeas from "./ClusterIdeas.svelte";
	import SyncedSongDemo from "./SyncedSongDemo.svelte";
	import SyncedSongRecorder from "./SyncedSongRecorder.svelte";
	import SyncedVideoRecorder from "./SyncedVideoRecorder.svelte";
	import {
		RECORD_TAB_AUDIO,
		RECORD_TAB_IDEAS,
		RECORD_TAB_LABELS,
		RECORD_TAB_PLAYBACK,
		RECORD_TAB_VIDEO,
		RECORD_TABS,
		type RecordTab
	} from "./recordTabs.js";
	import { readRecordTab, replaceTabInUrl } from "./recordUrlState.js";
	import type { PageProps } from "./$types.js";

	let { data }: PageProps = $props();

	const TAB_ID_PREFIX = "record";
	const PAGE_BACKGROUND = "#09090b";
	const PAGE_FOREGROUND = "#f4f4f5";

	let tab = $state(readRecordTab(currentSearchParams()));

	function selectTab(next: RecordTab) {
		tab = next;
		replaceTabInUrl(next);
	}
</script>

<svelte:head>
	<title>harmony — record</title>
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
			<h1 class="page-title">Record</h1>
		</div>

		<TabList
			tabs={RECORD_TABS}
			labels={RECORD_TAB_LABELS}
			{tab}
			idPrefix={TAB_ID_PREFIX}
			ariaLabel="Record views"
			onselect={selectTab}
		/>

		<div
			class="tab-panel"
			role="tabpanel"
			id="{TAB_ID_PREFIX}-panel-{tab}"
			aria-labelledby="{TAB_ID_PREFIX}-tab-{tab}"
		>
			{#if tab === RECORD_TAB_AUDIO}
				<DemoSection title="Record audio sync">
					<SyncedSongRecorder audioOptions={data.syncedSongAudio} />
				</DemoSection>
			{:else if tab === RECORD_TAB_VIDEO}
				<DemoSection title="Record video sync">
					<SyncedVideoRecorder />
				</DemoSection>
			{:else if tab === RECORD_TAB_PLAYBACK}
				<DemoSection title="Synced song player">
					<SyncedSongDemo />
				</DemoSection>
			{:else if tab === RECORD_TAB_IDEAS}
				<DemoSection title="Ideas by cluster">
					<ClusterIdeas
						ideas={data.clusterIdeas}
						audioSongKeys={data.syncedSongAudio.map((audio) => audio.songKey)}
					/>
				</DemoSection>
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

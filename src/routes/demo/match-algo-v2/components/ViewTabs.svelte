<script lang="ts">
	import TabList from "../../shared/TabList.svelte";
	import {
		MATCH_ALGO_V2_TAB_LABELS,
		MATCH_ALGO_V2_TABS,
		type MatchAlgoV2Tab
	} from "../matchAlgoV2UrlParams.js";

	type Props = {
		tab: MatchAlgoV2Tab;
		onselect: (tab: MatchAlgoV2Tab) => void;
	};

	const { tab, onselect }: Props = $props();
</script>

<TabList
	tabs={MATCH_ALGO_V2_TABS}
	labels={MATCH_ALGO_V2_TAB_LABELS}
	{tab}
	idPrefix="match-algo"
	ariaLabel="Match algo views"
	{onselect}
/>

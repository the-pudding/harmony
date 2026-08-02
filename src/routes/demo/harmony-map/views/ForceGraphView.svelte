<script lang="ts">
	import { allProgressionGroups } from "$data/core-progressions.js";
	import { buildProgressionNetwork } from "$data/progression-network.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import ForceGraph from "../graph/ForceGraph.svelte";
	import TabInfoPanel from "../tabs/TabInfoPanel.svelte";
	import { forceGraphDescription } from "../tabs/tabDescriptions.js";

	type Props = {
		songCoverages: SongCoverageEntry[];
		songs: GroupedSong[];
	};

	const { songCoverages, songs }: Props = $props();

	const networkData = $derived(
		buildProgressionNetwork(allProgressionGroups, songCoverages)
	);
</script>

<div class="force-graph-view">
	<div class="info">
		<TabInfoPanel description={forceGraphDescription} />
	</div>
	<div class="graph">
		<ForceGraph data={networkData} {songs} />
	</div>
</div>

<style>
	.force-graph-view {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		height: 100%;
		min-height: 0;
	}

	.info {
		flex-shrink: 0;
		padding: 0 1.25rem;
	}

	.graph {
		flex: 1;
		min-height: 0;
		position: relative;
	}
</style>

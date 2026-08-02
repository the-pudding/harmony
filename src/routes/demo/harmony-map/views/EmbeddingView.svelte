<script lang="ts">
	import type { Snippet } from "svelte";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import EmbeddingMethodSelector from "../components/EmbeddingMethodSelector.svelte";
	import EmbeddingScatter from "../components/EmbeddingScatter.svelte";
	import GroupColorLegend from "../components/GroupColorLegend.svelte";
	import SongVectorInspector from "../components/SongVectorInspector.svelte";
	import WeightingControls from "../components/WeightingControls.svelte";
	import type { ScatterPoint } from "../components/scatterPoint.js";
	import type { EmbeddingMethod } from "../embedding/reducers/types.js";
	import type { EmbeddingState } from "../embedding/state/createEmbeddingState.svelte.js";
	import {
		dominantGroupName,
		findNearestNeighbors
	} from "../embedding/vectors/index.js";

	type Props = {
		songCoverages: SongCoverageEntry[];
		songs: GroupedSong[];
		embedding: EmbeddingState;
		trailingControls?: Snippet;
	};

	const { songCoverages, songs, embedding, trailingControls }: Props = $props();

	const AXIS_LABELS_BY_METHOD: Record<
		EmbeddingMethod,
		{ x: string; y: string } | null
	> = {
		umap: null,
		pca: { x: "PC1", y: "PC2" },
		feature: { x: "dark ← harmony → bright", y: "simple ← harmony → complex" }
	};

	let selectedSongKey = $state<string | null>(null);

	const songByKey = $derived(
		new Map(songs.map((song) => [song.songKey, song]))
	);

	const groupNameBySongKey = $derived(
		new Map(
			songCoverages.map((entry) => [
				entry.songKey,
				dominantGroupName(entry.progressionCounts)
			])
		)
	);

	const points = $derived.by((): ScatterPoint[] =>
		songCoverages.flatMap((entry) => {
			const coords = embedding.result.coordsByKey.get(entry.songKey);
			if (!coords) return [];
			return [
				{
					songKey: entry.songKey,
					x: coords.x,
					y: coords.y,
					groupName: groupNameBySongKey.get(entry.songKey) ?? null
				}
			];
		})
	);

	const neighbors = $derived.by(() => {
		if (selectedSongKey === null) return [];
		const vector = embedding.vectorSet.vectorBySongKey.get(selectedSongKey);
		return vector
			? findNearestNeighbors(vector, embedding.vectorSet.vectors)
			: [];
	});

	const neighborSongKeys = $derived(
		new Set(neighbors.map((neighbor) => neighbor.songKey))
	);

	const selectedCoords = $derived(
		selectedSongKey === null
			? null
			: (embedding.result.coordsByKey.get(selectedSongKey) ?? null)
	);

	const isComputing = $derived(embedding.status === "computing");
</script>

<div class="embedding-view">
	<div class="controls">
		<div class="controls-left">
			<EmbeddingMethodSelector
				method={embedding.method}
				onChange={embedding.setMethod}
			/>

			<WeightingControls
				options={embedding.options}
				onChange={embedding.setOptions}
			/>

			<span class="dimension-count">
				{embedding.vocabulary.entries.length} dimensions
			</span>
		</div>

		{#if trailingControls}
			<div class="controls-right">
				{@render trailingControls()}
			</div>
		{/if}
	</div>

	<div class="body">
		<div class="plot">
			<EmbeddingScatter
				{points}
				{songByKey}
				{selectedSongKey}
				{neighborSongKeys}
				axisLabels={AXIS_LABELS_BY_METHOD[embedding.method]}
				onSelect={(songKey) => {
					selectedSongKey = songKey;
				}}
			/>
			{#if isComputing}
				<div class="plot-overlay">
					<span class="plot-overlay-text">Computing embedding…</span>
				</div>
			{/if}
			<GroupColorLegend />
		</div>

		<aside class="inspector-column">
			<SongVectorInspector
				songs={songCoverages}
				{songByKey}
				vocabulary={embedding.vocabulary}
				vectorSet={embedding.vectorSet}
				{selectedSongKey}
				{neighbors}
				coords={selectedCoords}
				componentLoadings={embedding.result.componentLoadings}
				explainedVariance={embedding.result.explainedVariance}
				onSelect={(songKey) => {
					selectedSongKey = songKey;
				}}
			/>
		</aside>
	</div>
</div>

<style>
	.embedding-view {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		height: 100%;
		min-height: 0;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		flex-wrap: wrap;
		padding: 0 1.25rem;
		flex-shrink: 0;
		position: relative;
		z-index: 10;
	}

	.controls-left {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.controls-right {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
		margin-left: auto;
	}

	.dimension-count {
		font-size: 0.7rem;
		color: #71717a;
	}

	.body {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 1fr 22rem;
		gap: 0.75rem;
		box-sizing: border-box;
	}

	.plot {
		position: relative;
		min-height: 0;
		overflow: hidden;
	}

	.plot-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(9, 9, 11, 0.5);
		pointer-events: none;
	}

	.plot-overlay-text {
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.inspector-column {
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 0 1.25rem 1rem 0;
		box-sizing: border-box;
	}
</style>

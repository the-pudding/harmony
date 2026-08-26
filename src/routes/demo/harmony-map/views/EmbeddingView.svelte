<script lang="ts">
	import type { Snippet } from "svelte";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import ArtistInspector from "../components/ArtistInspector.svelte";
	import EmbeddingMethodSelector from "../components/EmbeddingMethodSelector.svelte";
	import EmbeddingScatter from "../components/EmbeddingScatter.svelte";
	import GroupColorLegend from "../components/GroupColorLegend.svelte";
	import InspectorTabs from "../components/InspectorTabs.svelte";
	import SongVectorInspector from "../components/SongVectorInspector.svelte";
	import WeightingControls from "../components/WeightingControls.svelte";
	import { buildArtistSummaries } from "../../shared/artists/artistStats.js";
	import { songKeysMatchingGroupFilter } from "../../shared/progressionGroupShare.js";
	import type { ScatterPoint } from "../components/scatterPoint.js";
	import type { EmbeddingMethod } from "../embedding/reducers/types.js";
	import type { EmbeddingState } from "../embedding/state/createEmbeddingState.svelte.js";
	import {
		findNearestNeighbors,
		groupSharesForSong
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
		feature: { x: "dark ← harmony → bright", y: "simple ← harmony → complex" },
		groupBlend: null,
		ngram: null,
		scaleSplit: { x: "minor ← scale → major", y: "chord-gram UMAP" }
	};

	type InspectorTab = "song" | "artists";

	const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
		{ id: "song", label: "song" },
		{ id: "artists", label: "artists" }
	];

	let selectedSongKey = $state<string | null>(null);
	let inspectorTab = $state<InspectorTab>("song");
	let selectedArtistName = $state<string | null>(null);
	let selectedGroupLabel = $state<string | null>(null);
	let selectedProgressionName = $state<string | null>(null);

	const HIGHLIGHTED_SONGS_STORAGE_KEY = "harmony-map-highlighted-songs";

	const loadHighlightedSongKeys = (): Set<string> => {
		if (typeof localStorage === "undefined") return new Set();
		try {
			const raw = localStorage.getItem(HIGHLIGHTED_SONGS_STORAGE_KEY);
			return raw ? new Set(JSON.parse(raw)) : new Set();
		} catch {
			return new Set();
		}
	};

	let highlightedSongKeys = $state<Set<string>>(loadHighlightedSongKeys());

	const toggleHighlightedSong = (songKey: string) => {
		const next = new Set(highlightedSongKeys);
		if (next.has(songKey)) next.delete(songKey);
		else next.add(songKey);
		highlightedSongKeys = next;
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(
				HIGHLIGHTED_SONGS_STORAGE_KEY,
				JSON.stringify([...next])
			);
		}
	};

	const songByKey = $derived(
		new Map(songs.map((song) => [song.songKey, song]))
	);

	const artistSummaries = $derived(
		buildArtistSummaries(songCoverages, songByKey)
	);

	const selectedArtistSummary = $derived(
		selectedArtistName === null
			? null
			: (artistSummaries.find(
					(summary) => summary.artistName === selectedArtistName
				) ?? null)
	);

	const artistSongKeys = $derived(
		selectedArtistSummary === null
			? null
			: new Set(selectedArtistSummary.songs.map((song) => song.songKey))
	);

	const groupFilterSongKeys = $derived(
		selectedGroupLabel === null
			? null
			: songKeysMatchingGroupFilter(songCoverages, selectedGroupLabel, selectedProgressionName)
	);

	const visibleSongKeys = $derived.by((): Set<string> | null => {
		if (artistSongKeys === null && groupFilterSongKeys === null) return null;
		if (artistSongKeys === null) return groupFilterSongKeys;
		if (groupFilterSongKeys === null) return artistSongKeys;
		return new Set([...artistSongKeys].filter((key) => groupFilterSongKeys.has(key)));
	});

	const onSelectGroup = (label: string | null) => {
		selectedGroupLabel = label;
		selectedProgressionName = null;
	};

	const onSelectProgression = (name: string | null) => {
		selectedProgressionName = name;
	};

	const groupSharesBySongKey = $derived(
		new Map(
			songCoverages.map((entry) => [
				entry.songKey,
				groupSharesForSong(entry.progressionCounts)
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
					groupShares: groupSharesBySongKey.get(entry.songKey) ?? []
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

			{#if selectedArtistSummary}
				<button
					class="artist-filter-chip"
					onclick={() => (selectedArtistName = null)}
				>
					{selectedArtistSummary.artistName} · {selectedArtistSummary.songCount} songs
					<span class="chip-clear" aria-hidden="true">✕</span>
				</button>
			{/if}
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
				{highlightedSongKeys}
				{visibleSongKeys}
				method={embedding.method}
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
			<GroupColorLegend
				{songCoverages}
				{selectedGroupLabel}
				{selectedProgressionName}
				{onSelectGroup}
				{onSelectProgression}
			/>
		</div>

		<aside class="inspector-column">
			<InspectorTabs
				tabs={INSPECTOR_TABS}
				activeId={inspectorTab}
				onSelect={(id) => (inspectorTab = id)}
			/>

			{#if inspectorTab === "song"}
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
					{highlightedSongKeys}
					onToggleHighlight={toggleHighlightedSong}
					onSelect={(songKey) => {
						selectedSongKey = songKey;
					}}
				/>
			{:else}
				<ArtistInspector
					summaries={artistSummaries}
					selectedSummary={selectedArtistSummary}
					{songByKey}
					{selectedSongKey}
					onSelectArtist={(artistName) => {
						selectedArtistName = artistName;
					}}
					onSelectSong={(songKey) => {
						selectedSongKey = songKey;
					}}
				/>
			{/if}
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

	.artist-filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-family: inherit;
		font-size: 0.7rem;
		color: #e4e4e7;
		padding: 0.1875rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid rgba(99, 102, 241, 0.5);
		background: rgba(99, 102, 241, 0.18);
		cursor: pointer;
	}

	.artist-filter-chip:hover {
		background: rgba(99, 102, 241, 0.3);
	}

	.chip-clear {
		color: #a1a1aa;
		font-size: 0.6rem;
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
		gap: 0.5rem;
		padding: 0 1.25rem 1rem 0;
		box-sizing: border-box;
	}
</style>

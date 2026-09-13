<script lang="ts">
	import type { Snippet } from "svelte";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import ArtistInspector from "../components/ArtistInspector.svelte";
	import ClusterInspector from "../components/ClusterInspector.svelte";
	import EmbeddingMethodSelector from "../components/EmbeddingMethodSelector.svelte";
	import EmbeddingScatter from "../components/EmbeddingScatter.svelte";
	import EmbeddingScatter3D from "../components/EmbeddingScatter3D.svelte";
	import GroupColorLegend from "../components/GroupColorLegend.svelte";
	import InspectorTabs from "../components/InspectorTabs.svelte";
	import SongVectorInspector from "../components/SongVectorInspector.svelte";
	import WeightingControls from "../components/WeightingControls.svelte";
	import BlendControls from "../components/BlendControls.svelte";
	import { buildArtistSummaries } from "../../shared/artists/artistStats.js";
	import type { YearDomain } from "../../shared/artists/artistStats.js";
	import { songKeysMatchingGroupFilter } from "../../shared/progressionGroupShare.js";
	import type { ScatterPoint } from "../components/scatterPoint.js";
	import {
		getNamedClusters,
		namedClusterAnchorSongKeys,
		resolveClusterNames
	} from "../components/namedClusters.js";
	import { HIGHLIGHT_RING_COLOR } from "../components/highlightSongMarker.js";
	import type { EmbeddingMethod } from "../embedding/reducers/types.js";
	import { UMAP_DRIVEN_METHODS } from "../embedding/reducers/types.js";
	import { buildClusterInputPoints } from "../embedding/clustering/clusterInputPoints.js";
	import { buildClusterSummaries } from "../embedding/clustering/clusterSummaries.js";
	import { findDensityClusters } from "../embedding/clustering/densityClusters.js";
	import { computeClusterVisibleShares } from "../embedding/clustering/clusterVisibility.js";
	import { toCalendarYear } from "../../../../data/songYear.js";
	import YearScrubber from "../components/YearScrubber.svelte";
	import type { EmbeddingState } from "../embedding/state/createEmbeddingState.svelte.js";
	import { EMBEDDING_COMPUTING_STEPS } from "../embedding/state/createEmbeddingState.svelte.js";
	import {
		findNearestNeighbors,
		groupSharesForSong,
		dominantGroupName
	} from "../embedding/vectors/index.js";
	import { buildYearAxisBySongKey } from "../embedding/vectors/songYearAxis.js";
	import {
		MAP_VIEW_MODE_LABELS,
		MAP_VIEW_MODES,
		type MapViewMode
	} from "../viewMode.js";

	type Props = {
		songCoverages: SongCoverageEntry[];
		songs: GroupedSong[];
		embedding: EmbeddingState;
		viewMode: MapViewMode;
		onViewModeChange: (viewMode: MapViewMode) => void;
		trailingControls?: Snippet;
	};

	const {
		songCoverages,
		songs,
		embedding,
		viewMode,
		onViewModeChange,
		trailingControls
	}: Props = $props();

	const AXIS_LABELS_BY_METHOD: Record<
		EmbeddingMethod,
		{ x: string; y: string } | null
	> = {
		umap: null,
		pca: { x: "PC1", y: "PC2" },
		feature: { x: "dark ← harmony → bright", y: "simple ← harmony → complex" },
		groupBlend: { x: "dark ← harmony → bright", y: "simple ← harmony → complex" },
		ngram: null,
		scaleSplit: { x: "minor ← scale → major", y: "chord-gram UMAP" },
		content: { x: "dark ← harmony → bright", y: "simple ← harmony → complex" },
		blend: { x: "dark ← harmony → bright", y: "simple ← harmony → complex" }
	};

	type InspectorTab = "song" | "artists" | "clusters";

	const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
		{ id: "song", label: "song" },
		{ id: "artists", label: "artists" },
		{ id: "clusters", label: "clusters" }
	];

	let selectedSongKey = $state<string | null>(null);
	let inspectorTab = $state<InspectorTab>("song");
	let selectedArtistName = $state<string | null>(null);
	let selectedGroupLabel = $state<string | null>(null);
	let selectedProgressionName = $state<string | null>(null);
	// Off by default: dots start plain (grey/white) rather than colored by
	// core group blend, toggled on from the legend.
	let showFamilyColors = $state(false);
	// null = scrubber untouched, show everything (equivalent to the max year).
	let scrubYear = $state<number | null>(null);

	const setViewMode = (nextMode: MapViewMode) => {
		if (nextMode === viewMode) return;
		onViewModeChange(nextMode);
	};

	// Every anchor song across named clusters (src/data/named-clusters.ts) is
	// what shows highlighted on the map — editing happens in that file, not
	// in the app, so there's no user-toggled highlight state anymore.
	const highlightedSongKeys = namedClusterAnchorSongKeys;
	let hiddenClusterHashes = $state<Set<string>>(new Set());

	const CLUSTERABLE_METHODS = new Set<EmbeddingMethod>(UMAP_DRIVEN_METHODS);

	const songByKey = $derived(
		new Map(songs.map((song) => [song.songKey, song]))
	);

	const coverageByKey = $derived(
		new Map(songCoverages.map((coverage) => [coverage.songKey, coverage]))
	);

	const yearDomain = $derived.by((): YearDomain | null => {
		const years = songs.flatMap((song) =>
			song.year === undefined ? [] : [song.year]
		);
		return years.length === 0
			? null
			: { min: Math.min(...years), max: Math.max(...years) };
	});

	// Integer calendar-year bounds for the scrubber — "through 1975" reads as
	// "every song charted in or before 1975".
	const yearScrubBounds = $derived(
		yearDomain === null
			? null
			: {
					min: toCalendarYear(yearDomain.min),
					max: toCalendarYear(yearDomain.max)
				}
	);

	// The 3D-w/-time view already encodes year as the z-axis, so scrubbing on
	// top of that would double up on the same dimension — the scrubber is
	// disabled there (see the markup below) and has no effect either way.
	const scrubEnabled = $derived(viewMode !== "3dTime" && yearScrubBounds !== null);

	const effectiveScrubYear = $derived(scrubYear ?? yearScrubBounds?.max ?? null);

	// null = nothing hidden by time (scrubber at/after the last release, not
	// in use, or 3D w/ time). A song with no year is always treated as
	// already released, since we can't say it "hasn't come out yet".
	const releasedSongKeys = $derived.by((): Set<string> | null => {
		if (!scrubEnabled || effectiveScrubYear === null) return null;
		if (effectiveScrubYear >= yearScrubBounds!.max) return null;
		const keys = new Set<string>();
		for (const song of songs) {
			if (song.year === undefined || toCalendarYear(song.year) <= effectiveScrubYear) {
				keys.add(song.songKey);
			}
		}
		return keys;
	});

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

	// When an artist is selected, only their songs should read as
	// "highlighted" on the map — named-cluster-anchor rings/labels would
	// otherwise compete visually with the artist highlight. Scoped to the
	// map view only; SongVectorInspector's "cluster anchor" badge still uses
	// the unfiltered highlightedSongKeys below.
	const mapHighlightedSongKeys = $derived(
		artistSongKeys === null ? highlightedSongKeys : new Set<string>()
	);

	const groupFilterSongKeys = $derived(
		selectedGroupLabel === null
			? null
			: songKeysMatchingGroupFilter(songCoverages, selectedGroupLabel, selectedProgressionName)
	);

	// Artist selection no longer hides other songs — it highlights (see
	// artistSongKeys passed as emphasizedSongKeys below) so the map stays
	// unchanged and you can still see where the artist's songs sit relative
	// to everything else. The group/progression legend filter and the year
	// scrubber both actually hide non-matching points, so the dots the
	// scatter draws are whichever pass both (a song can be filtered out by
	// group AND not released yet at the same time).
	const visibleSongKeys = $derived.by((): Set<string> | null => {
		if (groupFilterSongKeys === null) return releasedSongKeys;
		if (releasedSongKeys === null) return groupFilterSongKeys;
		const intersection = new Set<string>();
		for (const songKey of groupFilterSongKeys) {
			if (releasedSongKeys.has(songKey)) intersection.add(songKey);
		}
		return intersection;
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

	const yearAxisBySongKey = $derived(buildYearAxisBySongKey(songs));

	const points = $derived.by((): ScatterPoint[] =>
		songCoverages.flatMap((entry) => {
			const coords = embedding.result.coordsByKey.get(entry.songKey);
			if (!coords) return [];
			const z =
				viewMode === "3dTime"
					? yearAxisBySongKey.get(entry.songKey)
					: viewMode === "3d"
						? coords.z
						: undefined;
			return [
				{
					songKey: entry.songKey,
					x: coords.x,
					y: coords.y,
					z,
					groupShares: groupSharesBySongKey.get(entry.songKey) ?? []
				}
			];
		})
	);

	const is3D = $derived(viewMode === "3d" || viewMode === "3dTime");

	const neighbors = $derived.by(() => {
		if (selectedSongKey === null) return [];
		const vector = embedding.vectorSet.vectorBySongKey.get(selectedSongKey);
		return vector
			? findNearestNeighbors(vector, embedding.vectorSet.vectors)
			: [];
	});

	const selectedCoords = $derived(
		selectedSongKey === null
			? null
			: (embedding.result.coordsByKey.get(selectedSongKey) ?? null)
	);

	const isComputing = $derived(embedding.status === "computing");

	let elapsedSeconds = $state(0);

	$effect(() => {
		if (embedding.status !== "computing") return;
		elapsedSeconds = 0;
		const start = Date.now();
		const interval = setInterval(() => {
			elapsedSeconds = Math.floor((Date.now() - start) / 1000);
		}, 1000);
		return () => clearInterval(interval);
	});

	const formatElapsed = (seconds: number): string => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${String(s).padStart(2, "0")}`;
	};

	const clustersAvailable = $derived(
		CLUSTERABLE_METHODS.has(embedding.method) && viewMode !== "3dTime"
	);

	// Deliberately keyed on groupFilterSongKeys alone, not the full
	// visibleSongKeys — clustering must stay blind to the year scrubber so
	// cluster identity, membership, and geometry never change as you scrub.
	// The scrubber only ever hides dots; it doesn't re-run DBSCAN.
	const clusterInputPoints = $derived(
		buildClusterInputPoints(
			groupFilterSongKeys === null
				? points
				: points.filter((point) => groupFilterSongKeys.has(point.songKey))
		)
	);

	const allClusters = $derived(
		clustersAvailable ? findDensityClusters(clusterInputPoints) : []
	);

	const mapClusters = $derived(
		allClusters.filter((cluster) => !hiddenClusterHashes.has(cluster.hash))
	);

	const clusterSummaries = $derived(
		buildClusterSummaries(
			allClusters,
			(songKey) => groupSharesBySongKey.get(songKey) ?? [],
			(songKey) => songByKey.get(songKey)?.year ?? null,
			(songKey) => {
				const coverage = coverageByKey.get(songKey);
				const song = songByKey.get(songKey);
				if (!coverage && !song) return null;
				return {
					title: coverage?.title ?? song?.title ?? songKey,
					artists: coverage?.artists ?? song?.artists ?? [],
					coveragePercent: coverage?.coveragePercent ?? 0,
					matchingProgressions: coverage?.matchingProgressions ?? [],
					dominantGroupName: coverage
						? dominantGroupName(coverage.progressionCounts)
						: null
				};
			}
		)
	);

	// Same universe clustering itself uses (respecting the group/progression
	// filter, if any) — just further narrowed to what's released so far —
	// so cluster percentages stay consistent with what findDensityClusters
	// actually saw.
	const totalReleasedCount = $derived.by(() => {
		const universe =
			groupFilterSongKeys === null
				? points
				: points.filter((point) => groupFilterSongKeys.has(point.songKey));
		return releasedSongKeys === null
			? universe.length
			: universe.filter((point) => releasedSongKeys.has(point.songKey)).length;
	});

	const clusterVisibleSharePercentByHash = $derived(
		computeClusterVisibleShares(allClusters, releasedSongKeys, totalReleasedCount)
	);

	const toggleClusterVisibility = (clusterHash: string) => {
		const next = new Set(hiddenClusterHashes);
		if (next.has(clusterHash)) next.delete(clusterHash);
		else next.add(clusterHash);
		hiddenClusterHashes = next;
	};

	const selectAllClusters = () => {
		hiddenClusterHashes = new Set();
	};

	const deselectAllClusters = () => {
		hiddenClusterHashes = new Set(allClusters.map((cluster) => cluster.hash));
	};

	const selectSong = (songKey: string | null) => {
		selectedSongKey = songKey;
		if (songKey !== null) inspectorTab = "song";
	};

	const emphasizedClusterHashes = $derived.by((): Set<string> | null => {
		const songKey = selectedSongKey;
		if (songKey === null) return null;
		return new Set(
			allClusters
				.filter((cluster) => cluster.songKeys.includes(songKey))
				.map((cluster) => cluster.hash)
		);
	});

	const coClusterSongKeys = $derived.by((): Set<string> => {
		const songKey = selectedSongKey;
		if (songKey === null) return new Set();
		return new Set(
			allClusters
				.filter((cluster) => cluster.songKeys.includes(songKey))
				.flatMap((cluster) => cluster.songKeys)
		);
	});

	const clusterNamesByHash = $derived(
		resolveClusterNames(allClusters, getNamedClusters())
	);

	const clusterRankByHash = $derived(
		new Map(
			clusterSummaries.map((summary, index) => [
				summary.cluster.hash,
				index + 1
			])
		)
	);

	const selectedSongClusterSummaries = $derived.by(() => {
		const songKey = selectedSongKey;
		if (songKey === null) return [];
		return clusterSummaries.filter((summary) =>
			summary.cluster.songKeys.includes(songKey)
		);
	});
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

			{#if embedding.method === "blend"}
				<BlendControls
					weights={embedding.blendWeights}
					onChange={embedding.setBlendWeights}
				/>
			{/if}

			<span class="dimension-count">
				{embedding.vocabulary.entries.length} dimensions
			</span>

			<div class="view-dimension-toggle" role="radiogroup" aria-label="View dimension">
				{#each MAP_VIEW_MODES as mode (mode)}
					<button
						type="button"
						class="view-dimension-button"
						class:view-dimension-button-active={viewMode === mode}
						aria-pressed={viewMode === mode}
						onclick={() => setViewMode(mode)}
					>
						{MAP_VIEW_MODE_LABELS[mode]}
					</button>
				{/each}
			</div>

			{#if yearScrubBounds && yearScrubBounds.min !== yearScrubBounds.max}
				<YearScrubber
					min={yearScrubBounds.min}
					max={yearScrubBounds.max}
					value={effectiveScrubYear ?? yearScrubBounds.max}
					disabled={viewMode === "3dTime"}
					onChange={(year) => (scrubYear = year)}
				/>
			{/if}

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
			{#if is3D}
				<EmbeddingScatter3D
					{points}
					{songByKey}
					{selectedSongKey}
					{coClusterSongKeys}
					highlightedSongKeys={mapHighlightedSongKeys}
					{visibleSongKeys}
					clusters={mapClusters}
					{emphasizedClusterHashes}
					showTimeAxisGizmo={viewMode === "3dTime"}
					enableSceneLighting={viewMode === "3d"}
					{showFamilyColors}
					emphasizedSongKeys={artistSongKeys}
					emphasisFillColor={artistSongKeys && HIGHLIGHT_RING_COLOR}
					onSelect={selectSong}
				/>
			{:else}
				<EmbeddingScatter
					{points}
					{songByKey}
					{selectedSongKey}
					{coClusterSongKeys}
					highlightedSongKeys={mapHighlightedSongKeys}
					{visibleSongKeys}
					method={embedding.method}
					clusters={mapClusters}
					{emphasizedClusterHashes}
					axisLabels={AXIS_LABELS_BY_METHOD[embedding.method]}
					emphasizedSongKeys={artistSongKeys}
					familyEmphasisSongKeys={artistSongKeys}
					emphasisFillColor={artistSongKeys && HIGHLIGHT_RING_COLOR}
					{showFamilyColors}
					onSelect={selectSong}
				/>
			{/if}
			{#if isComputing}
				<div class="plot-overlay">
					<div class="flex flex-col items-center gap-2">
						<span class="plot-overlay-text">Computing embedding…</span>
						{#if embedding.computingStep !== null}
							<ol class="flex flex-col gap-1 list-none">
								{#each EMBEDDING_COMPUTING_STEPS as step, i (step)}
									{@const isActive = step === embedding.computingStep}
									<li class="flex items-center gap-2 text-xs tabular-nums">
										<span class={isActive ? "text-indigo-400 font-semibold" : "text-zinc-600"}>{i + 1}.</span>
										<span class={isActive ? "text-indigo-300 font-semibold" : "text-zinc-600"}>{step}</span>
									</li>
								{/each}
							</ol>
						{/if}
						<span class="text-xs text-zinc-500 tabular-nums">{formatElapsed(elapsedSeconds)}</span>
					</div>
				</div>
			{/if}
			<GroupColorLegend
				{songCoverages}
				{selectedGroupLabel}
				{selectedProgressionName}
				{onSelectGroup}
				{onSelectProgression}
				{showFamilyColors}
				onToggleFamilyColors={() => (showFamilyColors = !showFamilyColors)}
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
					clusterSummaries={selectedSongClusterSummaries}
					{clustersAvailable}
					{hiddenClusterHashes}
					{yearDomain}
					{clusterRankByHash}
					{clusterNamesByHash}
					visibleSharePercentByClusterHash={clusterVisibleSharePercentByHash}
					onToggleClusterVisibility={toggleClusterVisibility}
					onSelect={selectSong}
				/>
			{:else if inspectorTab === "clusters"}
				<ClusterInspector
					summaries={clusterSummaries}
					{clustersAvailable}
					{hiddenClusterHashes}
					{yearDomain}
					{selectedSongKey}
					{songByKey}
					rankByClusterHash={clusterRankByHash}
					{clusterNamesByHash}
					visibleSharePercentByClusterHash={clusterVisibleSharePercentByHash}
					onSelectAllClusters={selectAllClusters}
					onDeselectAllClusters={deselectAllClusters}
					onToggleClusterVisibility={toggleClusterVisibility}
					onSelectSong={selectSong}
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
					onSelectSong={selectSong}
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

	.view-dimension-toggle {
		display: inline-flex;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 9999px;
		overflow: hidden;
	}

	.view-dimension-button {
		font-family: inherit;
		font-size: 0.65rem;
		color: #a1a1aa;
		padding: 0.25rem 0.625rem;
		border: none;
		background: transparent;
		cursor: pointer;
	}

	.view-dimension-button:hover {
		color: #e4e4e7;
	}

	.view-dimension-button-active {
		background: rgba(99, 102, 241, 0.18);
		color: #e4e4e7;
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

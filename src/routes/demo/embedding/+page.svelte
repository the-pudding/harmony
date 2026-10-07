<script lang="ts">
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { createEmbeddingState } from "../harmony-map/embedding/state/createEmbeddingState.svelte.js";
	import {
		UMAP_NEIGHBOR_COUNT,
		UMAP_RANDOM_SEED,
		UMAP_SPREAD
	} from "../harmony-map/embedding/reducers/index.js";
	import {
		DEFAULT_SONG_VECTOR_OPTIONS,
		type SongVectorOptions
	} from "../harmony-map/embedding/vectors/constants.js";
	import EmbeddingView from "../harmony-map/views/EmbeddingView.svelte";
	import { computeSongHomogeneity } from "../shared/progressionHomogeneity.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import {
		MAP_MODES,
		readMapModeFromUrl,
		replaceMapModeInUrl
	} from "./embeddingMapModeUrlState.js";

	// This page is locked to one configuration so the only variable is UMAP's
	// minimum distance. Every other setting is shown read-only at the top.
	const VECTOR_OPTIONS: SongVectorOptions = {
		...DEFAULT_SONG_VECTOR_OPTIONS,
		weighting: "chords",
		useTfIdf: false,
		l2Normalize: true,
		weightChorus: false
	};

	// A song is "pure" when one progression covers at least this share of its
	// matched chords. Unmatched chords are ignored, same as effective progressions.
	const PURE_DOMINANT_SHARE = 0.9;
	const PURE_SONG_COLOR = "#a855f7";

	// Redraws each circled cluster with the purest songs in the middle and
	// the most mixed on the rim. Display only: clusters are found first.
	let purityLayoutOn = $state(true);

	// Cluster detection for this page's larger corpus. 20 songs is the
	// smallest group that gets outlined; larger minimums fuse the mixed
	// middle of the map into one giant cluster. Clusters over 300 songs
	// aren't outlined.
	const CLUSTER_MIN_POINTS = 20;
	const CLUSTER_MAX_POINTS = 300;
	// A cluster is kept (outlined, colored in hex view and named) only when
	// at least this share of its songs have the same main progression. It's
	// named after that progression.
	const CLUSTER_MIN_PROGRESSION_SHARE = 0.25;

	const mapMode = $derived(readMapModeFromUrl(currentSearchParams()));

	// UMAP minimum distance. Lower than the harmony map's default so clusters
	// are tight and well separated. Change it here to try other values.
	const UMAP_MIN_DIST = 0.05;

	const coverage = createAllSongsCoverageState();

	const embedding = createEmbeddingState({
		getEntries: () => coverage.allSongsCoverageResult?.songCoverages ?? null,
		getSongs: () => coverage.baseList,
		getCoverageCacheKey: () => coverage.coverageCacheKey,
		initialMethod: "umap",
		initialUmapMinDist: UMAP_MIN_DIST
	});

	embedding.setOptions(VECTOR_OPTIONS);
	embedding.setDimension(2);

	const onOff = (value: boolean): string => (value ? "on" : "off");

	const settingsSummary = $derived([
		{ label: "method", value: "progression" },
		{ label: "dimensions", value: `${embedding.vocabulary.entries.length}` },
		{ label: "counts", value: "chords as written" },
		{ label: "chorus ×3", value: onOff(VECTOR_OPTIONS.weightChorus) },
		{ label: "TF-IDF", value: onOff(VECTOR_OPTIONS.useTfIdf) },
		{ label: "L2 norm", value: onOff(VECTOR_OPTIONS.l2Normalize) },
		{ label: "UMAP neighbors", value: `${UMAP_NEIGHBOR_COUNT}` },
		{ label: "min distance", value: `${UMAP_MIN_DIST}` },
		{ label: "spread", value: `${UMAP_SPREAD}` },
		{ label: "seed", value: `${UMAP_RANDOM_SEED}` },
		{
			label: "clusters",
			value: `${CLUSTER_MIN_POINTS}–${CLUSTER_MAX_POINTS} songs, ≥${Math.round(CLUSTER_MIN_PROGRESSION_SHARE * 100)}% one progression`
		},
		{ label: "view", value: "2D, uncolored" }
	]);

	const songCoverages = $derived(
		coverage.allSongsCoverageResult?.songCoverages ?? []
	);

	const pureSongKeys = $derived(
		new Set(
			songCoverages
				.filter(
					(entry) =>
						(computeSongHomogeneity(entry.progressionCounts)?.dominantShare ??
							0) >= PURE_DOMINANT_SHARE
				)
				.map((entry) => entry.songKey)
		)
	);

	const statusText = $derived.by(() => {
		if (coverage.loading) return "Loading song dataset…";
		if (coverage.loadError) return coverage.loadError;
		return `${coverage.baseList.length.toLocaleString()} songs`;
	});

	const isError = $derived(Boolean(coverage.loadError));

	const loadingText = $derived(
		coverage.loading ? "Loading songs…" : "Computing coverage…"
	);
</script>

<svelte:head>
	<title>harmony — embedding</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

{#snippet corpusControls()}
	<span class="status-text" class:error={isError}>{statusText}</span>
{/snippet}

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="page-body">
		<div class="settings-bar">
			<div class="map-mode-toggle" role="radiogroup" aria-label="Map view">
				{#each MAP_MODES as mode (mode.id)}
					<button
						type="button"
						role="radio"
						aria-checked={mapMode === mode.id}
						class="map-mode-button"
						class:map-mode-button-active={mapMode === mode.id}
						onclick={() => replaceMapModeInUrl(mode.id)}
					>
						{mode.label}
					</button>
				{/each}
			</div>

			<dl class="settings-summary" aria-label="Embedding settings (fixed)">
				{#each settingsSummary as setting (setting.label)}
					<div class="setting">
						<dt>{setting.label}</dt>
						<dd>{setting.value}</dd>
					</div>
				{/each}
			</dl>

			<button
				type="button"
				class="purity-layout-toggle"
				class:purity-layout-toggle-on={purityLayoutOn}
				aria-pressed={purityLayoutOn}
				title="Within each circled cluster, purer songs sit nearer the center and more mixed songs nearer the rim."
				onclick={() => (purityLayoutOn = !purityLayoutOn)}
			>
				purity → center: {purityLayoutOn ? "on" : "off"}
			</button>

			{#if mapMode === "hex"}
				<span class="pure-key">
					hex color = main progression · faded = mixed with others · gray = no
					clear main progression or outside clusters · zoom in for smaller
					hexes, then dots
				</span>
			{:else}
				<span class="pure-key">
					<span
						class="pure-swatch"
						style="background: {PURE_SONG_COLOR};"
						aria-hidden="true"
					></span>
					pure: one progression is ≥{Math.round(PURE_DOMINANT_SHARE * 100)}% of
					matched chords · {pureSongKeys.size.toLocaleString()} songs
				</span>
			{/if}
		</div>

		{#if coverage.allSongsCoverageResult}
			<EmbeddingView
				{songCoverages}
				songs={coverage.baseList}
				{embedding}
				viewMode="2d"
				onViewModeChange={() => {}}
				yearRange={null}
				onYearRangeChange={() => {}}
				showSettingsControls={false}
				showColorLegend={false}
				accentSongKeys={pureSongKeys}
				accentFillColor={PURE_SONG_COLOR}
				{mapMode}
				clusterMinPoints={CLUSTER_MIN_POINTS}
				clusterMaxPoints={CLUSTER_MAX_POINTS}
				clusterMinProgressionShare={CLUSTER_MIN_PROGRESSION_SHARE}
				purityLayout={purityLayoutOn
					? { pureThreshold: PURE_DOMINANT_SHARE }
					: null}
				trailingControls={corpusControls}
			/>
		{:else}
			<div class="loading-toolbar">
				{@render corpusControls()}
			</div>
			<div class="loading-overlay">
				<span class="loading-text">{loadingText}</span>
			</div>
		{/if}
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
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
		overflow: hidden;
	}

	.page-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 1rem 0 0;
		gap: 0.75rem;
		box-sizing: border-box;
		position: relative;
	}

	.settings-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		flex-shrink: 0;
		padding: 0 1.25rem;
	}

	.settings-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin: 0;
		font-size: 0.7rem;
	}

	.setting {
		display: flex;
		gap: 0.375rem;
	}

	.setting dt {
		color: #71717a;
	}

	.setting dd {
		margin: 0;
		color: #e4e4e7;
	}

	.map-mode-toggle {
		display: flex;
		gap: 0.25rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.125rem;
	}

	.map-mode-button {
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.7rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
	}

	.map-mode-button-active {
		background: rgba(99, 102, 241, 0.3);
		color: #f4f4f5;
	}

	.purity-layout-toggle {
		font-family: inherit;
		font-size: 0.7rem;
		color: #a1a1aa;
		background: transparent;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.3rem 0.625rem;
		cursor: pointer;
	}

	.purity-layout-toggle-on {
		color: #f4f4f5;
		border-color: rgba(99, 102, 241, 0.5);
		background: rgba(99, 102, 241, 0.2);
	}

	.pure-key {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7rem;
		color: #a1a1aa;
	}

	.pure-swatch {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.loading-toolbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		flex-shrink: 0;
		padding: 0 1.25rem;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.loading-overlay {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	.loading-text {
		font-size: 0.75rem;
		color: #52525b;
	}
</style>

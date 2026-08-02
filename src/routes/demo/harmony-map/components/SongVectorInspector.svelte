<script lang="ts">
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import type {
		ComponentLoading,
		Coords
	} from "../embedding/reducers/index.js";
	import type {
		ProgressionVocabulary,
		SongNeighbor,
		SongVectorSet
	} from "../embedding/vectors/index.js";
	import { dominantGroupName } from "../embedding/vectors/index.js";
	import {
		colorForGroupName,
		UNGROUPED_LABEL
	} from "../progressionGroupColors.js";

	type Props = {
		songs: SongCoverageEntry[];
		vocabulary: ProgressionVocabulary;
		vectorSet: SongVectorSet;
		selectedSongKey: string | null;
		neighbors: SongNeighbor[];
		coords: Coords | null;
		componentLoadings: ComponentLoading[][] | null;
		explainedVariance: number[] | null;
		onSelect: (songKey: string | null) => void;
	};

	const {
		songs,
		vocabulary,
		vectorSet,
		selectedSongKey,
		neighbors,
		coords,
		componentLoadings,
		explainedVariance,
		onSelect
	}: Props = $props();

	const MAX_SEARCH_RESULTS = 12;
	const COORD_DECIMALS = 2;
	const WEIGHT_DECIMALS = 3;
	const SIMILARITY_PERCENT_MULTIPLIER = 100;

	let query = $state("");

	const entryBySongKey = $derived(
		new Map(songs.map((song) => [song.songKey, song]))
	);

	const selectedEntry = $derived(
		selectedSongKey === null
			? null
			: (entryBySongKey.get(selectedSongKey) ?? null)
	);

	const searchResults = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (needle === "") return [];
		return songs
			.filter(
				(song) =>
					song.title.toLowerCase().includes(needle) ||
					song.artists.join(", ").toLowerCase().includes(needle)
			)
			.slice(0, MAX_SEARCH_RESULTS);
	});

	type VectorDimension = {
		chordProgression: string;
		isCore: boolean;
		count: number;
		inverseDocumentFrequency: number;
		weight: number;
		contribution: number;
	};

	const dimensions = $derived.by((): VectorDimension[] => {
		if (selectedSongKey === null) return [];
		const vector = vectorSet.vectorBySongKey.get(selectedSongKey);
		if (!vector) return [];
		const maxWeight = vector.weighted.reduce(
			(largest, weight) => Math.max(largest, Math.abs(weight)),
			0
		);
		return vocabulary.entries
			.map((entry) => ({
				chordProgression: entry.chordProgression,
				isCore: entry.isCore,
				count: vector.counts[entry.index],
				inverseDocumentFrequency:
					vectorSet.inverseDocumentFrequencies[entry.index],
				weight: vector.weighted[entry.index],
				contribution:
					maxWeight === 0
						? 0
						: Math.abs(vector.weighted[entry.index]) / maxWeight
			}))
			.filter((dimension) => dimension.count > 0)
			.sort((first, second) => second.weight - first.weight);
	});

	const selectedGroupName = $derived(
		selectedEntry ? dominantGroupName(selectedEntry.progressionCounts) : null
	);

	const loadingLabel = (loading: ComponentLoading): string =>
		vocabulary.entries[loading.featureIndex]?.chordProgression ?? "";

	const formatSimilarity = (similarity: number): string =>
		`${Math.round(similarity * SIMILARITY_PERCENT_MULTIPLIER)}%`;
</script>

<div class="inspector">
	<div class="search">
		<input
			class="search-input"
			type="search"
			placeholder="Search songs…"
			bind:value={query}
		/>
		{#if searchResults.length > 0}
			<ul class="search-results">
				{#each searchResults as song (song.songKey)}
					<li>
						<button
							class="search-result"
							onclick={() => {
								onSelect(song.songKey);
								query = "";
							}}
						>
							<span class="result-title">{song.title}</span>
							<span class="result-artists">{song.artists.join(", ")}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if !selectedEntry}
		<p class="empty">
			Click a point or search for a song to inspect the vector behind its
			position.
		</p>
	{:else}
		<div class="selected-header">
			<div class="selected-identity">
				<span class="selected-title">{selectedEntry.title}</span>
				<span class="selected-artists">{selectedEntry.artists.join(", ")}</span>
			</div>
			<button class="clear-button" onclick={() => onSelect(null)}>clear</button>
		</div>

		<dl class="facts">
			<div class="fact">
				<dt>position</dt>
				<dd>
					{coords
						? `${coords.x.toFixed(COORD_DECIMALS)}, ${coords.y.toFixed(COORD_DECIMALS)}`
						: "—"}
				</dd>
			</div>
			<div class="fact">
				<dt>dominant group</dt>
				<dd>
					<span
						class="group-dot"
						style:background={colorForGroupName(selectedGroupName)}
					></span>
					{selectedGroupName ?? UNGROUPED_LABEL}
				</dd>
			</div>
			<div class="fact">
				<dt>nonzero dims</dt>
				<dd>{dimensions.length} / {vocabulary.entries.length}</dd>
			</div>
		</dl>

		<section class="section">
			<h3 class="section-title">vector dimensions</h3>
			<ul class="dimension-list">
				{#each dimensions as dimension (dimension.chordProgression)}
					<li class="dimension">
						<div class="dimension-head">
							<span class="dimension-name">{dimension.chordProgression}</span>
							<span
								class="dimension-badge"
								class:dimension-badge-core={dimension.isCore}
							>
								{dimension.isCore ? "core" : "gap"}
							</span>
						</div>
						<div class="dimension-bar">
							<div
								class="dimension-fill"
								style:width="{dimension.contribution * 100}%"
							></div>
						</div>
						<div class="dimension-stats">
							<span>count {dimension.count}</span>
							<span
								>idf {dimension.inverseDocumentFrequency.toFixed(
									WEIGHT_DECIMALS
								)}</span
							>
							<span>weight {dimension.weight.toFixed(WEIGHT_DECIMALS)}</span>
						</div>
					</li>
				{/each}
			</ul>
		</section>

		<section class="section">
			<h3 class="section-title">nearest neighbors (cosine)</h3>
			<ul class="neighbor-list">
				{#each neighbors as neighbor (neighbor.songKey)}
					{@const entry = entryBySongKey.get(neighbor.songKey)}
					{#if entry}
						<li>
							<button
								class="neighbor"
								onclick={() => onSelect(neighbor.songKey)}
							>
								<span class="neighbor-title">{entry.title}</span>
								<span class="neighbor-similarity"
									>{formatSimilarity(neighbor.similarity)}</span
								>
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		</section>
	{/if}

	{#if componentLoadings}
		<section class="section">
			<h3 class="section-title">principal component loadings</h3>
			{#each componentLoadings as loadings, componentIndex (componentIndex)}
				<div class="component">
					<p class="component-label">
						PC{componentIndex + 1}
						{#if explainedVariance?.[componentIndex] !== undefined}
							<span class="component-variance"
								>{Math.round(explainedVariance[componentIndex] * 100)}% var</span
							>
						{/if}
					</p>
					<ul class="loading-list">
						{#each loadings as loading (loading.featureIndex)}
							<li class="loading">
								<span class="loading-name">{loadingLabel(loading)}</span>
								<span class="loading-value"
									>{loading.loading.toFixed(WEIGHT_DECIMALS)}</span
								>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.inspector {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		height: 100%;
		overflow-y: auto;
		padding: 0.875rem;
		box-sizing: border-box;
		background: rgba(24, 24, 27, 0.55);
		border: 1px solid rgba(63, 63, 70, 0.7);
		border-radius: 0.5rem;
		font-size: 0.75rem;
		color: #d4d4d8;
	}

	.search {
		position: relative;
	}

	.search-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(9, 9, 11, 0.8);
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
	}

	.search-results {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		max-height: 12rem;
		overflow-y: auto;
	}

	.search-result,
	.neighbor {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.25rem 0.375rem;
		border: none;
		border-radius: 0.25rem;
		background: rgba(63, 63, 70, 0.25);
		color: #d4d4d8;
		font-family: inherit;
		font-size: 0.7rem;
		text-align: left;
		cursor: pointer;
	}

	.search-result:hover,
	.neighbor:hover {
		background: rgba(99, 102, 241, 0.25);
		color: #f4f4f5;
	}

	.result-artists,
	.neighbor-similarity {
		color: #71717a;
		flex-shrink: 0;
	}

	.empty {
		margin: 0;
		color: #71717a;
		line-height: 1.5;
	}

	.selected-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.selected-identity {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.selected-title {
		font-weight: 600;
		color: #f4f4f5;
	}

	.selected-artists {
		font-size: 0.7rem;
		color: #71717a;
	}

	.clear-button {
		flex-shrink: 0;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.25rem;
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.65rem;
		padding: 0.125rem 0.375rem;
		cursor: pointer;
	}

	.clear-button:hover {
		color: #f4f4f5;
		border-color: rgba(113, 113, 122, 0.9);
	}

	.facts {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
	}

	.fact {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.fact dt {
		color: #71717a;
	}

	.fact dd {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		text-align: right;
	}

	.group-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		border-top: 1px solid rgba(63, 63, 70, 0.7);
		padding-top: 0.625rem;
	}

	.section-title {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.dimension-list,
	.neighbor-list,
	.loading-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.dimension {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}

	.dimension-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.dimension-name {
		font-size: 0.7rem;
		color: #e4e4e7;
	}

	.dimension-badge {
		font-size: 0.6rem;
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		background: rgba(63, 63, 70, 0.6);
		color: #a1a1aa;
	}

	.dimension-badge-core {
		background: rgba(21, 128, 61, 0.35);
		color: rgba(134, 239, 172, 0.95);
	}

	.dimension-bar {
		height: 0.25rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.dimension-fill {
		height: 100%;
		background: rgba(99, 102, 241, 0.8);
	}

	.dimension-stats {
		display: flex;
		gap: 0.625rem;
		font-size: 0.6rem;
		color: #71717a;
	}

	.component {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.component-label {
		margin: 0;
		font-size: 0.7rem;
		color: #a1a1aa;
		display: flex;
		gap: 0.375rem;
		align-items: baseline;
	}

	.component-variance {
		font-size: 0.6rem;
		color: #71717a;
	}

	.loading {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.65rem;
	}

	.loading-name {
		color: #d4d4d8;
	}

	.loading-value {
		color: #71717a;
	}
</style>

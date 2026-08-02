<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import EmbeddingScatter from "../components/EmbeddingScatter.svelte";
	import SongVectorInspector from "../components/SongVectorInspector.svelte";
	import type { ScatterPoint } from "../components/scatterPoint.js";
	import {
		EMBEDDING_METHODS,
		type EmbeddingMethod
	} from "../embedding/reducers/types.js";
	import type { EmbeddingState } from "../embedding/state/createEmbeddingState.svelte.js";
	import {
		dominantGroupName,
		findNearestNeighbors
	} from "../embedding/vectors/index.js";
	import {
		GROUP_COLOR_LEGEND_EXPLANATION,
		GROUP_COLOR_LEGEND_TITLE,
		groupLegendItems
	} from "../progressionGroupColors.js";
	import MethodInfoPanel from "../components/MethodInfoPanel.svelte";
	import {
		embeddingMethodDescriptions,
		embeddingMethodLabels
	} from "../methodDescriptions.js";

	type Props = {
		songCoverages: SongCoverageEntry[];
		songs: GroupedSong[];
		embedding: EmbeddingState;
	};

	const { songCoverages, songs, embedding }: Props = $props();

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

	const toggleOption = (key: "useTfIdf" | "l2Normalize") => {
		embedding.setOptions({
			...embedding.options,
			[key]: !embedding.options[key]
		});
	};

	const toggleBinaryWeighting = () => {
		embedding.setOptions({
			...embedding.options,
			weighting: embedding.options.weighting === "binary" ? "raw" : "binary"
		});
	};
</script>

<div class="embedding-view">
	<div class="controls">
		<div
			class="method-selector"
			role="radiogroup"
			aria-label="Embedding method"
		>
			{#each EMBEDDING_METHODS as method (method)}
				<button
					class="method-button"
					class:method-button-active={method === embedding.method}
					role="radio"
					aria-checked={method === embedding.method}
					onclick={() => embedding.setMethod(method)}
				>
					{embeddingMethodLabels[method]}
				</button>
			{/each}
		</div>

		<div class="weighting-controls">
			<label class="toggle">
				<input
					type="checkbox"
					checked={embedding.options.useTfIdf}
					onchange={() => toggleOption("useTfIdf")}
				/>
				TF-IDF
			</label>
			<label class="toggle">
				<input
					type="checkbox"
					checked={embedding.options.l2Normalize}
					onchange={() => toggleOption("l2Normalize")}
				/>
				L2 norm
			</label>
			<label class="toggle">
				<input
					type="checkbox"
					checked={embedding.options.weighting === "binary"}
					onchange={toggleBinaryWeighting}
				/>
				binary counts
			</label>
		</div>

		<span class="dimension-count">
			{embedding.vocabulary.entries.length} dimensions
		</span>
	</div>

	<div class="info">
		<MethodInfoPanel description={embeddingMethodDescriptions[embedding.method]} />
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
			<div class="legend">
				<div class="legend-header">
					<span class="legend-title">{GROUP_COLOR_LEGEND_TITLE}</span>
					<button
						class="legend-info"
						type="button"
						aria-label={GROUP_COLOR_LEGEND_EXPLANATION}
					>
						<span aria-hidden="true">i</span>
						<span class="legend-info-tooltip" aria-hidden="true"
							>{GROUP_COLOR_LEGEND_EXPLANATION}</span
						>
					</button>
				</div>
				{#each groupLegendItems as item (item.label)}
					<div class="legend-item">
						<span class="legend-dot" style:background={item.color}></span>
						<span>{item.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<aside class="inspector-column">
			<SongVectorInspector
				songs={songCoverages}
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
		gap: 1.25rem;
		flex-wrap: wrap;
		padding: 0 1.25rem;
		flex-shrink: 0;
	}

	.info {
		flex-shrink: 0;
		padding: 0 1.25rem;
	}

	.method-selector {
		display: flex;
		gap: 0.25rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.125rem;
	}

	.method-button {
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.7rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.method-button:hover {
		color: #e4e4e7;
	}

	.method-button-active {
		background: rgba(99, 102, 241, 0.3);
		color: #f4f4f5;
	}

	.weighting-controls {
		display: flex;
		gap: 0.75rem;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.3125rem;
		font-size: 0.7rem;
		color: #a1a1aa;
		cursor: pointer;
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
		padding: 0 1.25rem 1rem;
		box-sizing: border-box;
	}

	.plot {
		position: relative;
		min-height: 0;
		border: 1px solid rgba(63, 63, 70, 0.7);
		border-radius: 0.5rem;
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

	.legend {
		position: absolute;
		bottom: 0.75rem;
		left: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: rgba(9, 9, 11, 0.75);
		border: 1px solid rgba(63, 63, 70, 0.6);
		border-radius: 0.375rem;
		padding: 0.5rem 0.75rem;
		pointer-events: none;
		max-width: 14rem;
	}

	.legend-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding-bottom: 0.25rem;
		margin-bottom: 0.125rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.6);
	}

	.legend-title {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a1a1aa;
	}

	.legend-info {
		position: relative;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 0.875rem;
		height: 0.875rem;
		padding: 0;
		border-radius: 50%;
		border: 1px solid rgba(113, 113, 122, 0.8);
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.55rem;
		font-style: italic;
		cursor: help;
	}

	.legend-info:hover,
	.legend-info:focus-visible {
		color: #f4f4f5;
		border-color: rgba(161, 161, 170, 0.9);
	}

	.legend-info-tooltip {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		width: 16rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(9, 9, 11, 0.98);
		color: #d4d4d8;
		font-size: 0.65rem;
		font-style: normal;
		line-height: 1.5;
		text-transform: none;
		letter-spacing: normal;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.15s ease,
			visibility 0.15s ease;
	}

	.legend-info:hover .legend-info-tooltip,
	.legend-info:focus-visible .legend-info-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6rem;
		color: #a1a1aa;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.inspector-column {
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
</style>

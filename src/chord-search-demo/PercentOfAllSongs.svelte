<script lang="ts">
	import { onMount } from "svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import { chordToRomanToken } from "./computeNextChordProbabilities.js";
	import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
	import { buildSearchAbstract } from "./buildSearchAbstract.js";
	import { matchSongResultsChunk, type SongResultsChunkFilters } from "./matchSongResultsChunk.js";
	import { buildSongResultsCorpusState, type SongResultsWorkerEntry } from "./songResultsIndex.js";
	
	const CELL = 5;
	const GAP = 1;
	const STEP = CELL + GAP;

	type ProgressionEntry = { name: string; tokens: string[] };

	type CoverageResult = {
		allSongKeys: string[];
		progressionMatches: Set<string>[];
		coveredKeys: Set<string>;
		totalCount: number;
		coveredCount: number;
	};

	let containerWidth = $state(0);
	let progressionData = $state<ProgressionEntry[]>([]);
	let workerIndex = $state<SongResultsWorkerEntry[] | null>(null);
	let coverage = $state<CoverageResult | null>(null);

	const songs = $derived(chordSearchDemoStore.songs);
	const searchChords = $derived(chordSearchDemoStore.searchChords);
	const fuzzySearch = $derived(chordSearchDemoStore.fuzzySearch);
	const matchAtBeginningOnly = $derived(chordSearchDemoStore.matchAtBeginningOnly);
	const matchAtLeastTwice = $derived(chordSearchDemoStore.matchAtLeastTwice);
	const ignoreSlashBassNotes = $derived(chordSearchDemoStore.ignoreSlashBassNotes);
	onMount(async () => {
		try {
			const res = await fetch("/data/core-progressions.csv");
			const text = await res.text();
			progressionData = text
				.trim()
				.split("\n")
				.slice(1)
				.map((line) => {
					const comma = line.indexOf(",");
					return {
						name: line.slice(0, comma).trim(),
						tokens: line.slice(comma + 1).trim().split("-")
					};
				});
		} catch {
			// silently fail
		}
	});

	// Build the song index once when songs load — expensive, don't redo on filter changes
	let indexVersion = 0;
	$effect(() => {
		if (songs.length === 0) {
			workerIndex = null;
			return;
		}
		const snap = songs;
		const ver = ++indexVersion;
		setTimeout(() => {
			if (ver !== indexVersion) return;
			workerIndex = buildSongResultsCorpusState(snap).workerIndex;
		}, 0);
	});

	// Recompute coverage when index, progressions, or any matching toggle changes
	let coverageVersion = 0;
	$effect(() => {
		const idx = workerIndex;
		const progs = progressionData;
		const opts = { fuzzySearch, matchAtBeginningOnly, matchAtLeastTwice, ignoreSlashBassNotes };

		if (!idx || progs.length === 0) {
			coverage = null;
			return;
		}

		const ver = ++coverageVersion;
		const snapIdx = idx;
		const snapOpts = opts;
		setTimeout(() => {
			if (ver !== coverageVersion) return;
			coverage = computeCoverage(snapIdx, progs, snapOpts);
		}, 0);
	});

	function computeCoverage(
		index: SongResultsWorkerEntry[],
		progressions: ProgressionEntry[],
		opts: {
			fuzzySearch: boolean;
			matchAtBeginningOnly: boolean;
			matchAtLeastTwice: boolean;
			ignoreSlashBassNotes: boolean;
		}
	): CoverageResult {
		const filters: SongResultsChunkFilters = {
			hasSearchChords: true,
			titleFilter: "",
			selectedArtist: "",
			yearRange: null,
			fuzzySearch: opts.fuzzySearch,
			matchAtBeginningOnly: opts.matchAtBeginningOnly,
			matchAtLeastTwice: opts.matchAtLeastTwice
		};

		const progressionMatches: Set<string>[] = progressions.map(() => new Set());

		for (let pi = 0; pi < progressions.length; pi++) {
			const parsed = romanTokensToParsedProgression(progressions[pi].tokens);
			if (!parsed) continue;

			const searchAbstract = buildSearchAbstract(parsed, {
				ignoreSlashBassNotes: opts.ignoreSlashBassNotes,
				fuzzySearch: opts.fuzzySearch
			});
			if (!searchAbstract) continue;

			const { matchedSongKeys } = matchSongResultsChunk(index, filters, searchAbstract);
			for (const key of matchedSongKeys) progressionMatches[pi].add(key);
		}

		const coveredKeys = new Set<string>();
		for (const m of progressionMatches) for (const k of m) coveredKeys.add(k);

		const allSongKeySet = new Set(index.map((e) => e.songKey));

		// Sort: most progressions matched first so covered songs cluster at top
		const allSongKeys = [...allSongKeySet].sort((a, b) => {
			const ac = progressionMatches.filter((m) => m.has(a)).length;
			const bc = progressionMatches.filter((m) => m.has(b)).length;
			return bc - ac;
		});

		return {
			allSongKeys,
			progressionMatches,
			coveredKeys,
			totalCount: allSongKeySet.size,
			coveredCount: coveredKeys.size
		};
	}

	type SongSection = { label: string | null; romanTokens: string[] };
	type SongMetaEntry = { title: string; artists: string[]; sections: SongSection[] };

	function baseSongTitle(fullTitle: string): string {
		return fullTitle.replace(/\s*\([^)]*\)\s*$/, "").trim() || fullTitle;
	}

	function sectionLabel(fullTitle: string): string | null {
		return fullTitle.match(/\(([^)]*)\)\s*$/)?.[1] ?? null;
	}

	// Metadata map for hover — collects all sections per unique song
	const songMeta = $derived.by(() => {
		const map = new Map<string, SongMetaEntry>();
		for (const song of songs) {
			if (!song.romanTokens?.length) continue;
			const key = song.songKey ?? song.id ?? song.title;
			if (!map.has(key)) {
				map.set(key, {
					title: baseSongTitle(song.title),
					artists: song.artists,
					sections: []
				});
			}
			map.get(key)!.sections.push({
				label: sectionLabel(song.title),
				romanTokens: song.romanTokens
			});
		}
		return map;
	});

	let hoveredKey = $state<string | null>(null);
	const hoveredSong = $derived(hoveredKey ? (songMeta.get(hoveredKey) ?? null) : null);

	function handleMouseMove(e: MouseEvent) {
		if (!coverage || cols === 0) { hoveredKey = null; return; }
		const svgEl = e.currentTarget as SVGSVGElement;
		const rect = svgEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const col = Math.floor(x / STEP);
		const row = Math.floor(y / STEP);
		const idx = row * cols + col;
		hoveredKey = idx >= 0 && idx < coverage.allSongKeys.length
			? coverage.allSongKeys[idx]
			: null;
	}

	const searchTokens = $derived(
		searchChords.map(chordToRomanToken).filter((t): t is string => t !== null)
	);

	const activeIdx = $derived.by(() => {
		if (searchTokens.length === 0 || progressionData.length === 0) return -1;
		const str = searchTokens.join("-");
		return progressionData.findIndex((p) => p.tokens.join("-") === str);
	});

	const activeSet = $derived.by(() => {
		if (activeIdx >= 0 && coverage) return coverage.progressionMatches[activeIdx];
		return null;
	});

	const cols = $derived(containerWidth > 0 ? Math.max(1, Math.floor(containerWidth / STEP)) : 0);
	const svgHeight = $derived(
		coverage && cols > 0 ? Math.ceil(coverage.totalCount / cols) * STEP : 0
	);

	const totalPct = $derived(
		coverage ? Math.round((coverage.coveredCount / coverage.totalCount) * 100) : null
	);
	const activePct = $derived(
		activeSet && coverage
			? Math.round((activeSet.size / coverage.totalCount) * 100)
			: null
	);
	const activeName = $derived(activeIdx >= 0 ? progressionData[activeIdx]?.name : null);
</script>

<section class="section">
	<div class="heading">
		<h2 class="title">Song coverage</h2>
		<p class="subtitle">
			{#if totalPct !== null}
				{#if activePct !== null && activeName}
					<span class="active-stat">{activeSet?.size.toLocaleString()} songs ({activePct}%)</span> match
					<span class="active-name">{activeName}</span>
					·
				{/if}
				<span class="total-stat">{coverage?.coveredCount.toLocaleString()} songs ({totalPct}%)</span> covered by all core progressions
			{:else if !workerIndex}
				Building song index…
			{:else}
				Computing…
			{/if}
		</p>
	</div>

	{#if coverage}
		<div class="grid-wrap" bind:clientWidth={containerWidth}>
			{#if cols > 0 && svgHeight > 0}
				<svg
					width={containerWidth}
					height={svgHeight}
					role="img"
					aria-label="Song coverage dot grid"
					style="cursor: crosshair;"
					onmousemove={handleMouseMove}
					onmouseleave={() => { hoveredKey = null; }}
				>
					{#each coverage.allSongKeys as key, i (key)}
						{@const isActive = activeSet?.has(key) ?? false}
						{@const isCovered = !isActive && coverage.coveredKeys.has(key)}
						<rect
							class="dot"
							class:dot-active={isActive}
							class:dot-covered={isCovered}
							class:dot-hovered={key === hoveredKey}
							x={(i % cols) * STEP}
							y={Math.floor(i / cols) * STEP}
							width={CELL}
							height={CELL}
							rx="1"
						/>
					{/each}
				</svg>
			{/if}
		</div>

		{#if hoveredSong}
			<div class="hover-info">
				<span class="hover-title">{hoveredSong.title}</span>
				<span class="hover-artist">{hoveredSong.artists.join(", ")}</span>
				{#each hoveredSong.sections as section}
					<div class="hover-section">
						{#if section.label}
							<span class="hover-section-label">{section.label}</span>
						{/if}
						<span class="hover-chords">{section.romanTokens.join(" → ")}</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="hover-info hover-info-empty">hover a dot to see song details</div>
		{/if}
	{/if}

</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.heading {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
		line-height: 1.4;
	}

	.active-stat {
		color: #89b4fa;
		font-weight: 600;
	}

	.active-name {
		color: #a5b4fc;
	}

	.total-stat {
		color: #e4e4e7;
		font-weight: 600;
	}

	.grid-wrap {
		width: 100%;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
		padding: 0.75rem;
		box-sizing: border-box;
	}

	.dot {
		fill: rgba(255, 255, 255, 0.07);
		transition: fill 0.3s ease;
	}

	.dot-covered {
		fill: rgba(99, 102, 241, 0.35);
	}

	.dot-active {
		fill: #89b4fa;
	}

	.dot-hovered {
		fill: #ffffff !important;
	}

	.hover-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-height: 3.5rem;
		padding: 0.5rem 0.25rem;
		border-top: 1px solid rgba(39, 39, 42, 0.6);
	}

	.hover-info-empty {
		font-size: 0.75rem;
		color: #3f3f46;
		font-style: italic;
		justify-content: center;
	}

	.hover-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #f4f4f5;
		line-height: 1.3;
	}

	.hover-artist {
		font-size: 0.75rem;
		color: #71717a;
	}

	.hover-section {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		margin-top: 0.25rem;
	}

	.hover-section-label {
		font-size: 0.625rem;
		font-weight: 500;
		color: #52525b;
		text-transform: lowercase;
		letter-spacing: 0.02em;
	}

	.hover-chords {
		font-size: 0.6875rem;
		color: #52525b;
		line-height: 1.4;
	}

</style>

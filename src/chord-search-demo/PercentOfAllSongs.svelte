<script lang="ts">
	import { onMount } from "svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import { chordToRomanToken } from "./computeNextChordProbabilities.js";
	import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
	import { buildSearchAbstract } from "./buildSearchAbstract.js";
	import { matchSongResultsChunk, type SongResultsChunkFilters } from "./matchSongResultsChunk.js";
	import { buildSongResultsCorpusState, type SongResultsWorkerEntry } from "./songResultsIndex.js";
	import {
		computeTopProgressions,
		computeMinCoverageSet,
		filterSubsumedProgressions,
		type ProgressionStat,
		type MinCoverageEntry
	} from "./computeTopProgressions.js";
	import ToggleSwitch from "./ToggleSwitch.svelte";
	import { SEQUENCE_CHART_LENGTH_COLORS } from "./constants.js";

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
	const aggregateRepeats = $derived(chordSearchDemoStore.aggregateRepeats);
	const minNumChordsToCountAsAProgression = $derived(chordSearchDemoStore.minNumChordsToCountAsAProgression);

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
		const label = searchTokens.join("→");
		if (label) return topProgressions.find((p) => p.label === label)?.songKeys ?? null;
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

	// Top progressions + greedy coverage set — recompute when songs or toggle criteria change
	let topProgressions = $state<ProgressionStat[]>([]);
	let minCoverageSet = $state<MinCoverageEntry[]>([]);
	let filterSubsumed = $state(false);
	let topProgsVersion = 0;

	const displayedTopProgressions = $derived(
		filterSubsumed ? filterSubsumedProgressions(topProgressions) : topProgressions
	);

	$effect(() => {
		const snap = songs;
		const opts = { aggregateRepeats, matchAtBeginningOnly, matchAtLeastTwice, minLength: minNumChordsToCountAsAProgression };
		if (snap.length === 0) return;
		const ver = ++topProgsVersion;
		setTimeout(() => {
			if (ver !== topProgsVersion) return;
			const top = computeTopProgressions(snap, opts, 30);
			if (ver !== topProgsVersion) return;
			topProgressions = top;
			minCoverageSet = computeMinCoverageSet(top, coverage?.totalCount ?? snap.length, 0.7);
		}, 20);
	});

	// Recompute min set when coverage total or filter changes
	$effect(() => {
		const total = coverage?.totalCount;
		const pool = displayedTopProgressions;
		if (!total || pool.length === 0) return;
		minCoverageSet = computeMinCoverageSet(pool, total, 0.7);
	});

	const coreLabels = $derived(new Set(progressionData.map((p) => p.tokens.join("→"))));

	function setProgressionFromTokens(tokens: string[]) {
		const parsed = romanTokensToParsedProgression(tokens);
		if (!parsed) return;
		chordSearchDemoStore.getProgressionSearch().setProgression(parsed);
		chordSearchDemoStore.syncSearch();
	}

	function lengthColor(len: number): string {
		return SEQUENCE_CHART_LENGTH_COLORS[len] ?? "#888888";
	}
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

	{#if topProgressions.length > 0}
		<div class="list-section">
			<h3 class="list-title">Top progressions by songs matched</h3>
			<ToggleSwitch
				checked={filterSubsumed}
				onchange={(v) => { filterSubsumed = v; }}
				label="🧩 Only show maximal progressions — hide sub-sequences that are fully contained within a longer one in this list (e.g. hides I→V when I→V→vi→IV is present)"
			/>
			<div class="prog-list">
				{#each displayedTopProgressions as prog (prog.label)}
					{@const pct = coverage ? prog.songKeys.size / coverage.totalCount : 0}
					{@const isCore = coreLabels.has(prog.label)}
					{@const isActive = searchTokens.join("→") === prog.label}
					<button
						class="prog-row"
						class:prog-row-active={isActive}
						onclick={() => setProgressionFromTokens(prog.tokens)}
						title="Search for {prog.label}"
					>
						<span class="prog-label" style:color={lengthColor(prog.tokens.length)}>
							{prog.label}
						</span>
						{#if isCore}<span class="core-badge">core</span>{/if}
						<span class="prog-bar-wrap">
							<span class="prog-bar" style:width="{pct * 100}%" style:background={lengthColor(prog.tokens.length)}></span>
						</span>
						<span class="prog-count">{prog.songKeys.size.toLocaleString()}</span>
					</button>
				{/each}
			</div>
		</div>

		{#if minCoverageSet.length > 0}
			{@const finalPct = minCoverageSet[minCoverageSet.length - 1].runningPct}
			<div class="list-section">
				<h3 class="list-title">
					Minimum set for ~{Math.round(finalPct * 100)}% coverage
					<span class="list-subtitle">({minCoverageSet.length} progressions)</span>
				</h3>
				<div class="prog-list">
					{#each minCoverageSet as entry, i (entry.label)}
						{@const isActive = searchTokens.join("→") === entry.label}
						<button
							class="prog-row"
							class:prog-row-active={isActive}
							onclick={() => setProgressionFromTokens(entry.tokens)}
							title="Search for {entry.label}"
						>
							<span class="min-rank">{i + 1}</span>
							<span class="prog-label" style:color={lengthColor(entry.tokens.length)}>
								{entry.label}
							</span>
							<span class="prog-bar-wrap">
								<span class="prog-bar running-bar" style:width="{entry.runningPct * 100}%"></span>
							</span>
							<span class="prog-count">
								+{entry.addedSongs.toLocaleString()}
								<span class="running-pct">→ {Math.round(entry.runningPct * 100)}%</span>
							</span>
						</button>
					{/each}
				</div>
			</div>
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

	.list-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.list-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: #a1a1aa;
		margin: 0;
		letter-spacing: 0.01em;
	}


	.list-subtitle {
		font-weight: 400;
		color: #52525b;
	}

	.prog-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.prog-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.375rem;
		background: none;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		text-align: left;
		color: inherit;
		font-family: inherit;
		font-size: 0.6875rem;
		transition: background 0.12s ease;
	}

	.prog-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.prog-row-active {
		background: rgba(137, 180, 250, 0.1);
	}

	.prog-label {
		flex: 1;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.core-badge {
		font-size: 0.5625rem;
		font-weight: 600;
		color: #52525b;
		border: 1px solid #3f3f46;
		border-radius: 0.2rem;
		padding: 0 0.25rem;
		flex-shrink: 0;
	}

	.prog-bar-wrap {
		position: relative;
		flex-shrink: 0;
		width: 5rem;
		height: 4px;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 2px;
		overflow: hidden;
	}

	.prog-bar {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		border-radius: 2px;
		opacity: 0.7;
		transition: width 0.3s ease;
	}

	.running-bar {
		background: #89b4fa;
	}

	.prog-count {
		flex-shrink: 0;
		width: 5.5rem;
		font-size: 0.625rem;
		color: #71717a;
		white-space: nowrap;
		text-align: right;
	}

	.running-pct {
		color: #52525b;
	}

	.min-rank {
		font-size: 0.5625rem;
		color: #3f3f46;
		min-width: 1rem;
		text-align: right;
		flex-shrink: 0;
	}
</style>

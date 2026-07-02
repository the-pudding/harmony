<script lang="ts">
	import debounce from "lodash.debounce";
	import coreProgressionsData from "$data/core-progressions.js";
	import type { CoreProgression } from "$data/core-progressions.js";
	import { onMount, untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import ToggleSwitch from "../../../chord-search-demo/ToggleSwitch.svelte";
	import SongSelectDropdown from "./SongSelectDropdown.svelte";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import { computeProgressionMatches } from "./progressionMatchAnalysis.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import {
		type GroupedSong,
		type SongSection
	} from "../progressions/songBrowser.js";
	import {
		fetchGroupedAllSongs,
		fetchGroupedPopularSongs,
		findGroupedSongByKey,
		isGroupedSongKeyKnown,
		sortAllSongs,
		sortPopularSongs
	} from "../progressions/songBrowserData.js";
	import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
	import {
		findSubProgressionMatches,
		isPositionInMatch
	} from "../../../chord-processing/match-chord-progressions/index.js";
	import type { SubProgressionMatch } from "../../../chord-processing/types.js";
	import {
		areDefineChordProgressionUrlStatesEqual,
		buildDefineChordProgressionUrlState,
		DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS,
		defineChordProgressionUrlStateToQueryString,
		readDefineChordProgressionUrlState
	} from "./defineChordProgressionUrlParams.js";

	let popularSongs = $state<GroupedSong[]>([]);
	let fullSongs = $state<GroupedSong[] | null>(null);
	let loading = $state(true);
	let loadingFullSongs = $state(false);
	let loadError = $state("");
	let showPopularOnly = $state(true);
	let titleFilter = $state("");
	let selectedKey = $state("");
	let hoveredProgression = $state<string | null>(null);
	let pinnedProgression = $state<string | null>(null);
	const coreProgressions: CoreProgression[] = coreProgressionsData;
	let urlInitialized = $state(false);
	let applyingFromUrl = $state(false);
	let fullSongsLoadPromise = $state<Promise<GroupedSong[]> | null>(null);

	const debouncedReplaceState = debounce((nextUrl: string) => {
		replaceState(nextUrl, page.state);
	}, DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS);

	const ensureFullSongsLoaded = (): Promise<GroupedSong[]> => {
		if (fullSongs !== null) return Promise.resolve(fullSongs);
		if (fullSongsLoadPromise) return fullSongsLoadPromise;

		loadingFullSongs = true;
		const promise = fetchGroupedAllSongs()
			.then((songs) => {
				fullSongs = songs;
				return songs;
			})
			.catch((err) => {
				loadError = err instanceof Error ? err.message : String(err);
				throw err;
			})
			.finally(() => {
				loadingFullSongs = false;
				fullSongsLoadPromise = null;
			});

		fullSongsLoadPromise = promise;
		return promise;
	};

	onMount(() => {
		const load = async () => {
			try {
				popularSongs = await fetchGroupedPopularSongs();
			} catch (err) {
				loadError = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		};

		void load();

		return () => debouncedReplaceState.cancel();
	});

	const searchableSongs = $derived(fullSongs ?? popularSongs);

	const baseList = $derived.by((): GroupedSong[] => {
		if (showPopularOnly) {
			return sortPopularSongs(popularSongs);
		}
		return sortAllSongs(fullSongs ?? []);
	});

	const filteredSongs = $derived.by(() => {
		const q = titleFilter.trim().toLowerCase();
		if (!q) return baseList;
		return baseList.filter(
			(song) =>
				song.title.toLowerCase().includes(q) ||
				song.artists.some((artist) => artist.toLowerCase().includes(q))
		);
	});

	const selectedSong = $derived(
		findGroupedSongByKey(searchableSongs, selectedKey)
	);

	const activeProgression = $derived(hoveredProgression ?? pinnedProgression);

	const coreProgressionMatches = $derived(
		selectedSong ? computeProgressionMatches(selectedSong, coreProgressions) : []
	);

	const isSongKeyKnown = (songKey: string): boolean =>
		isGroupedSongKeyKnown(searchableSongs, songKey);

	$effect(() => {
		if (loading || popularSongs.length === 0) return;

		page.url.search;

		untrack(() => {
			applyingFromUrl = true;
			try {
				const urlState = readDefineChordProgressionUrlState(
					page.url.searchParams
				);
				const urlSongKey = urlState.song;
				if (
					urlSongKey &&
					!isGroupedSongKeyKnown(searchableSongs, urlSongKey) &&
					fullSongs === null &&
					!loadingFullSongs
				) {
					void ensureFullSongsLoaded();
					return;
				}
				if (urlSongKey && isGroupedSongKeyKnown(searchableSongs, urlSongKey)) {
					selectedKey = urlSongKey;
				} else if (!urlInitialized) {
					selectedKey = baseList[0]?.songKey ?? "";
				}
				urlInitialized = true;
			} finally {
				applyingFromUrl = false;
			}
		});
	});

	$effect(() => {
		if (!urlInitialized || applyingFromUrl) return;

		showPopularOnly;
		baseList;

		if (selectedKey && isSongKeyKnown(selectedKey)) return;

		selectedKey = baseList[0]?.songKey ?? "";
	});

	$effect(() => {
		if (!urlInitialized || loading || applyingFromUrl) return;

		selectedKey;

		const desiredState = buildDefineChordProgressionUrlState({
			selectedSongKey: selectedKey
		});
		const currentUrlState = readDefineChordProgressionUrlState(
			page.url.searchParams
		);

		if (areDefineChordProgressionUrlStatesEqual(desiredState, currentUrlState)) {
			return;
		}

		const queryString = defineChordProgressionUrlStateToQueryString(desiredState);
		const nextUrl = queryString
			? `${page.url.pathname}?${queryString}`
			: page.url.pathname;

		debouncedReplaceState(nextUrl);
	});

	$effect(() => {
		selectedKey;
		hoveredProgression = null;
		pinnedProgression = null;
	});

	const parsedSearchProgression = $derived.by(() => {
		if (!activeProgression) return null;
		return romanTokensToParsedProgression(activeProgression.split("-"));
	});

	function handleSongSelect(songKey: string) {
		selectedKey = songKey;
	}

	function handlePopularToggleChange(checked: boolean) {
		showPopularOnly = checked;
		if (!checked && fullSongs === null) {
			void ensureFullSongsLoaded();
		}
	}

	function handleProgressionHover(chordProgression: string) {
		hoveredProgression = chordProgression;
	}

	function handleProgressionUnhover() {
		hoveredProgression = null;
	}

	function handleProgressionSelect(chordProgression: string) {
		pinnedProgression =
			pinnedProgression === chordProgression ? null : chordProgression;
	}

	type Segment = { matchIndex: number; indices: number[] };

	function buildSegments(section: SongSection, matches: SubProgressionMatch[]): Segment[] {
		const n = section.parsedProgression.length;
		const posToMatch = Array.from({ length: n }, (_, pos) =>
			matches.findIndex((match) => isPositionInMatch(pos, match, n))
		);
		const segments: Segment[] = [];
		for (let i = 0; i < n; i++) {
			const mi = posToMatch[i];
			const last = segments[segments.length - 1];
			if (last && last.matchIndex === mi) {
				last.indices.push(i);
			} else {
				segments.push({ matchIndex: mi, indices: [i] });
			}
		}
		return segments;
	}

	function sectionMatches(section: SongSection): SubProgressionMatch[] {
		if (!parsedSearchProgression) return [];
		return findSubProgressionMatches(section.parsedProgression, parsedSearchProgression);
	}
</script>

<svelte:head>
	<title>harmony — define 'chord progression'</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<h1 class="page-title">
			How do we determine the core chord progressions that define a songs harmonic
			essense?
		</h1>

		{#if loading}
			<p class="dataset-status">Loading song dataset…</p>
		{:else if loadingFullSongs && !showPopularOnly}
			<p class="dataset-status">Loading full song dataset…</p>
		{:else if loadError}
			<p class="dataset-status error">{loadError}</p>
		{/if}

		{#if baseList.length > 0}
			<section class="step-section">
				<h2 class="section-heading">0. Pick an example song</h2>

				<div class="controls">
					<SongSelectDropdown
						songs={baseList}
						{selectedSong}
						{selectedKey}
						bind:searchQuery={titleFilter}
						onSelectedKeyChange={handleSongSelect}
					/>
					<ToggleSwitch
						checked={showPopularOnly}
						onchange={handlePopularToggleChange}
						label="popular recent songs only"
					/>
				</div>

				<p class="list-meta">
					{#if titleFilter.trim() ? filteredSongs.length === 0 : baseList.length === 0}
						No songs match
					{:else if titleFilter.trim()}
						{filteredSongs.length.toLocaleString()} songs match
					{:else}
						{baseList.length.toLocaleString()} songs
					{/if}
				</p>

				{#if selectedSong}
					<div class="song-card">
						<div class="song-title-row">
							<span class="song-name">{selectedSong.title}</span>
							{#if selectedSong.year !== undefined}
								<span class="year">({selectedSong.year})</span>
							{/if}
							<span class="artist">— {selectedSong.artists.join(", ")}</span>
							{#if selectedSong.keyLabel}
								<span class="key-label">· {selectedSong.keyLabel}</span>
							{/if}
						</div>
						<div class="sections">
							{#each selectedSong.sections as section, si (si)}
								{@const matches = sectionMatches(section)}
								{@const segments = buildSegments(section, matches)}
								<div class="section-row">
									{#if section.label}
										<span class="section-label">{section.label}</span>
									{/if}
									<div class="chords">
										{#each segments as segment, segi}
											{#if segment.matchIndex !== -1}
												<span class="match-group">
													{#each segment.indices as pos, i}
														<span class="chord highlighted">
															{section.romanTokens[pos]}
														</span>
														{#if i < segment.indices.length - 1}
															<span class="dot">·</span>
														{/if}
													{/each}
												</span>
											{:else}
												{#each segment.indices as pos, i}
													<span class="chord">{section.romanTokens[pos]}</span>
													{#if i < segment.indices.length - 1}
														<span class="dot">·</span>
													{/if}
												{/each}
											{/if}
											{#if segi < segments.length - 1}
												<span class="dot">·</span>
											{/if}
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</section>

			{#if selectedSong}
				<section class="step-section">
					<h2 class="section-heading">1. Look for matches from our core progressions</h2>

					{#if coreProgressionMatches.length > 0}
						<div class="button-row">
							{#each coreProgressionMatches as match (match.name)}
								<ProgressionMatchButton
									{match}
									active={pinnedProgression === match.chordProgression}
									onhover={handleProgressionHover}
									onunhover={handleProgressionUnhover}
									onselect={handleProgressionSelect}
								/>
							{/each}
						</div>
					{:else}
						<p class="list-meta">No core progressions matched this song.</p>
					{/if}
				</section>
			{/if}
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
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		max-width: 56rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 0;
		color: #f4f4f5;
	}

	.step-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-heading {
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
		color: #a1a1aa;
	}

	.dataset-status {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}

	.dataset-status.error {
		color: #fca5a5;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.list-meta {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.button-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.song-card {
		padding: 0.625rem;
		border: 1px solid #27272a;
		border-radius: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.song-title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.song-name {
		color: #fff;
		font-weight: 500;
	}

	.year,
	.artist,
	.key-label {
		color: #71717a;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.section-row {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.section-label {
		flex-shrink: 0;
		font-size: 0.5625rem;
		font-weight: 500;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		color: #52525b;
		min-width: 4.5rem;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.125rem;
		font-size: 0.75rem;
	}

	.chord {
		color: #a1a1aa;
		padding: 0.125rem 0.375rem;
	}

	.chord.highlighted {
		background: #4338ca;
		color: #fff;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.match-group {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		border: 1px solid rgba(99, 102, 241, 0.55);
		border-radius: 0.375rem;
		padding: 0.2rem;
	}

	.dot {
		color: #3f3f46;
	}
</style>

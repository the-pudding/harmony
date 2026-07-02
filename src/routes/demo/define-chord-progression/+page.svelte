<script lang="ts">
	import debounce from "lodash.debounce";
	import { onMount, untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import ToggleSwitch from "../../../chord-search-demo/ToggleSwitch.svelte";
	import CoreProgressionButtons, {
		type CoreProgression
	} from "./CoreProgressionButtons.svelte";
	import SongSelectDropdown from "./SongSelectDropdown.svelte";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import {
		buildTop10MatchKeys,
		groupSongs,
		isPopularRecentSong,
		parseTop10SongsCsv,
		type GroupedSong,
		type SongSection
	} from "../progressions/songBrowser.js";
	import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
	import {
		findSubProgressionMatches,
		isPositionInMatch
	} from "../../../chord-processing/match-chord-progressions/index.js";
	import type { SongInput, SubProgressionMatch } from "../../../chord-processing/types.js";
	import {
		areDefineChordProgressionUrlStatesEqual,
		buildDefineChordProgressionUrlState,
		DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS,
		defineChordProgressionUrlStateToQueryString,
		readDefineChordProgressionUrlState
	} from "./defineChordProgressionUrlParams.js";

	let allSongs = $state<GroupedSong[]>([]);
	let top10Keys = $state<Set<string>>(new Set());
	let loading = $state(true);
	let loadError = $state("");
	let showPopularOnly = $state(true);
	let titleFilter = $state("");
	let selectedKey = $state("");
	let selectedProgression = $state<string | null>(null);
	let coreProgressions = $state<CoreProgression[]>([]);
	let urlInitialized = $state(false);
	let applyingFromUrl = $state(false);

	const debouncedReplaceState = debounce((nextUrl: string) => {
		replaceState(nextUrl, page.state);
	}, DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS);

	onMount(() => {
		const load = async () => {
			try {
				const [songsRes, top10Res, progressionsRes] = await Promise.all([
					fetch("/data/songs.json"),
					fetch("/top10-songs.csv"),
					fetch("/data/core-progressions.json")
				]);
				if (!songsRes.ok)
					throw new Error(`Could not load song dataset: HTTP ${songsRes.status}`);
				if (!top10Res.ok)
					throw new Error(`Could not load top 10 songs: HTTP ${top10Res.status}`);

				const songs: SongInput[] = await songsRes.json();
				const top10Text = await top10Res.text();

				allSongs = groupSongs(songs);
				top10Keys = buildTop10MatchKeys(parseTop10SongsCsv(top10Text));
				if (progressionsRes.ok) {
					coreProgressions = await progressionsRes.json();
				}
			} catch (err) {
				loadError = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		};

		void load();

		return () => debouncedReplaceState.cancel();
	});

	const baseList = $derived.by((): GroupedSong[] => {
		if (showPopularOnly) {
			return allSongs
				.filter((song) => isPopularRecentSong(song, top10Keys))
				.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
		}
		return [...allSongs].sort((a, b) => a.title.localeCompare(b.title));
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
		allSongs.find((song) => song.songKey === selectedKey) ?? null
	);

	const isSongKeyKnown = (songKey: string): boolean =>
		allSongs.some((song) => song.songKey === songKey);

	$effect(() => {
		if (loading || allSongs.length === 0) return;

		page.url.search;

		untrack(() => {
			applyingFromUrl = true;
			try {
				const urlState = readDefineChordProgressionUrlState(
					page.url.searchParams
				);
				if (urlState.song && isSongKeyKnown(urlState.song)) {
					selectedKey = urlState.song;
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

	const parsedSearchProgression = $derived.by(() => {
		if (!selectedProgression) return null;
		return romanTokensToParsedProgression(selectedProgression.split("-"));
	});

	function handleSongSelect(songKey: string) {
		selectedKey = songKey;
	}

	function handleProgressionSelect(chordProgression: string) {
		selectedProgression =
			selectedProgression === chordProgression ? null : chordProgression;
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
		{#if loading}
			<p class="dataset-status">Loading song dataset…</p>
		{:else if loadError}
			<p class="dataset-status error">{loadError}</p>
		{/if}

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
				onchange={(checked) => (showPopularOnly = checked)}
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

		{#if baseList.length > 0}
			<CoreProgressionButtons
				progressions={coreProgressions}
				activeProgression={selectedProgression}
				onselect={handleProgressionSelect}
			/>

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
		gap: 1rem;
		width: 100%;
		max-width: 56rem;
		margin: 0 auto;
		box-sizing: border-box;
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

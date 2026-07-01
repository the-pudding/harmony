<script lang="ts">
	import { onMount } from "svelte";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import ToggleSwitch from "../../../chord-search-demo/ToggleSwitch.svelte";
	import {
		buildTop10MatchKeys,
		groupSongs,
		isPopularRecentSong,
		parseTop10SongsCsv,
		type GroupedSong
	} from "./songBrowser.js";
	import type { SongInput } from "../../../chord-processing/types.js";

	const PAGE_SIZE = 20;

	let allSongs = $state<GroupedSong[]>([]);
	let top10Keys = $state<Set<string>>(new Set());
	let loading = $state(true);
	let loadError = $state("");
	let showPopularOnly = $state(false);
	let titleFilter = $state("");
	let page = $state(0);

	onMount(() => {
		const load = async () => {
			try {
				const [songsRes, top10Res] = await Promise.all([
					fetch("/data/songs.json"),
					fetch("/top10-songs.csv")
				]);
				if (!songsRes.ok)
					throw new Error(
						`Could not load song dataset: HTTP ${songsRes.status}`
					);
				if (!top10Res.ok)
					throw new Error(
						`Could not load top 10 songs: HTTP ${top10Res.status}`
					);

				const songs: SongInput[] = await songsRes.json();
				const top10Text = await top10Res.text();

				allSongs = groupSongs(songs);
				top10Keys = buildTop10MatchKeys(parseTop10SongsCsv(top10Text));
			} catch (err) {
				loadError = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		};

		void load();
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

	const totalPages = $derived(
		Math.max(1, Math.ceil(filteredSongs.length / PAGE_SIZE))
	);
	const pageSongs = $derived(
		filteredSongs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
	);

	$effect(() => {
		titleFilter;
		showPopularOnly;
		page = 0;
	});

	function prevPage() {
		if (page > 0) page--;
	}
	function nextPage() {
		if (page < totalPages - 1) page++;
	}
</script>

<svelte:head>
	<title>harmony — progressions</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
	/>
</svelte:head>

<div class="page">
	<TopNavBar showSearch={false} />

	<div class="content">
		{#if loading}
			<p class="dataset-status">Loading song dataset…</p>
		{:else if loadError}
			<p class="dataset-status error">{loadError}</p>
		{/if}

		<div class="controls">
			<input
				class="filter-input"
				type="search"
				placeholder="Filter by title or artist…"
				bind:value={titleFilter}
			/>
			<ToggleSwitch
				checked={showPopularOnly}
				onchange={(checked) => (showPopularOnly = checked)}
				label="popular recent songs only"
			/>
		</div>

		<p class="list-meta">
			{#if filteredSongs.length === 0}
				No songs match
			{:else}
				{filteredSongs.length.toLocaleString()} songs · page {page + 1} of {totalPages}
			{/if}
		</p>

		<div class="songs">
			{#each pageSongs as song (song.songKey)}
				<div class="song-card">
					<div class="song-title-row">
						<span class="song-name">{song.title}</span>
						{#if song.year !== undefined}
							<span class="year">({song.year})</span>
						{/if}
						<span class="artist">— {song.artists.join(", ")}</span>
					</div>
					<div class="sections">
						{#each song.sections as section, si (si)}
							<div class="section-row">
								{#if section.label}
									<span class="section-label">{section.label}</span>
								{/if}
								<div class="chords">
									{#each section.chords as chord, i (i)}
										<span class="chord">{chord}</span>
										{#if i < section.chords.length - 1}
											<span class="dot">·</span>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				<button class="page-btn" onclick={prevPage} disabled={page === 0}
					>← prev</button
				>
				<span class="page-info">{page + 1} / {totalPages}</span>
				<button
					class="page-btn"
					onclick={nextPage}
					disabled={page >= totalPages - 1}>next →</button
				>
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
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: 3.25rem;
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

	.filter-input {
		flex: 1;
		min-width: 12rem;
		box-sizing: border-box;
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.8125rem;
		padding: 0.5rem 0.75rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.filter-input:focus {
		border-color: rgba(99, 102, 241, 0.6);
	}

	.filter-input::placeholder {
		color: #52525b;
	}

	.list-meta {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.songs {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
	.artist {
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

	.dot {
		color: #3f3f46;
	}

	.pagination {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: center;
		padding: 0.5rem 0;
	}

	.page-btn {
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.375rem 0.75rem;
		cursor: pointer;
		transition:
			color 0.12s,
			border-color 0.12s,
			background 0.12s;
	}

	.page-btn:hover:not(:disabled) {
		color: #f4f4f5;
		border-color: #52525b;
		background: rgba(39, 39, 42, 0.6);
	}

	.page-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.page-info {
		font-size: 0.75rem;
		color: #71717a;
	}
</style>

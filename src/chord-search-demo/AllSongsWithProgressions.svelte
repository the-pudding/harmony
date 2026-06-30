<script lang="ts">
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import { isPositionInMatch } from "../chord-processing/match-chord-progressions/match.js";
	import { buildYouTubeSearchUrl } from "./youtubeSearch.js";
	import { SONG_DATA_SOURCE_TITLE } from "./constants.js";

	// One color per unique progression within a song (cycles if > 8 unique progressions).
	const PROGRESSION_COLORS = [
		"#f5a97f", // peach
		"#89b4fa", // blue
		"#a6e3a1", // green
		"#f38ba8", // pink
		"#cba6f7", // mauve
		"#f9e2af", // yellow
		"#94e2d5", // teal
		"#eba0ac", // maroon
	];
	import type { SubProgressionMatch, SongDataSource } from "../chord-processing/types.js";

	const PAGE_SIZE = 20;
	const MAX_GRAM_LEN = 6;

	type Segment = { matchIndex: number; indices: number[] };

	type RawSection = { label: string | null; tokens: string[] };

	function countOccurrences(tokens: string[], pattern: string[]): number {
		let count = 0;
		for (let i = 0; i <= tokens.length - pattern.length; i++) {
			if (pattern.every((t, j) => t === tokens[i + j])) count++;
		}
		return count;
	}

	function periodByFirstRepeat(tokens: string[], minLen: number): string[] | null {
		for (let L = minLen; L * 2 <= tokens.length && L <= MAX_GRAM_LEN; L++) {
			if (tokens.slice(0, L).every((t, i) => t === tokens[L + i])) {
				return tokens.slice(0, L);
			}
		}
		return null;
	}

	// Like fundamentalAttribution, but when matchAtLeastTwice is true, the repetition
	// threshold is checked across all sections of the song rather than within one section.
	function fundamentalAttributionForSong(
		section: RawSection,
		allSections: RawSection[],
		opts: { minLength: number; matchAtLeastTwice: boolean }
	): string[] | null {
		const minLen = Math.max(2, opts.minLength);
		const period = periodByFirstRepeat(section.tokens, minLen);
		if (period) return period;

		const tokens = section.tokens;
		const minOccurrences = opts.matchAtLeastTwice ? 2 : 1;
		let bestLen = 0;
		let bestCount = 0;

		for (let len = minLen; len <= Math.min(MAX_GRAM_LEN, tokens.length); len++) {
			const prefix = tokens.slice(0, len);
			const total = opts.matchAtLeastTwice
				? allSections.reduce((sum, sec) => sum + countOccurrences(sec.tokens, prefix), 0)
				: countOccurrences(tokens, prefix);
			if (total >= minOccurrences && total >= bestCount) {
				bestLen = len;
				bestCount = total;
			}
		}

		return bestLen > 0 ? tokens.slice(0, bestLen) : null;
	}

	const SECTION_RANK_PATTERNS: Array<(s: string) => boolean> = [
		(s) => s.startsWith("intro"),
		(s) => s.startsWith("verse"),
		(s) => s.startsWith("pre-chorus"),
		(s) => s.startsWith("chorus"),
		(s) => s.startsWith("bridge"),
		(s) => s.startsWith("solo"),
		(s) => s.startsWith("instrumental"),
		(s) => s.startsWith("pre-outro"),
		(s) => s.startsWith("outro")
	];

	function sectionRank(label: string | null): number {
		if (!label) return SECTION_RANK_PATTERNS.length;
		const lower = label.toLowerCase();
		const idx = SECTION_RANK_PATTERNS.findIndex((fn) => fn(lower));
		return idx === -1 ? SECTION_RANK_PATTERNS.length : idx;
	}

	type ProcessedSection = RawSection & {
		pattern: string[] | null;
		matches: SubProgressionMatch[];
		segments: Segment[];
		color: string | null;
	};

	type GroupedSong = {
		songKey: string;
		title: string;
		artists: string[];
		year?: number;
		source?: SongDataSource;
		popularityScore?: number;
		inTop10?: boolean;
		inTop40?: boolean;
		inTop100?: boolean;
		sections: RawSection[];
	};

	type SongProgression = {
		label: string;
		tokens: string[];
		count: number;
		color: string;
	};

	type ProcessedSong = Omit<GroupedSong, "sections"> & {
		sections: ProcessedSection[];
		totalMatchCount: number;
		progressions: SongProgression[];
	};

	const songs = $derived(chordSearchDemoStore.songs);
	const matchAtLeastTwice = $derived(chordSearchDemoStore.matchAtLeastTwice);
	const matchAtBeginningOnly = $derived(chordSearchDemoStore.matchAtBeginningOnly);
	const minNumChords = $derived(chordSearchDemoStore.minNumChordsToCountAsAProgression);

	let page = $state(0);
	let titleFilter = $state("");

	function findTokenMatches(
		tokens: string[],
		pattern: string[],
		atBeginningOnly: boolean
	): SubProgressionMatch[] {
		const matches: SubProgressionMatch[] = [];
		for (let i = 0; i <= tokens.length - pattern.length; i++) {
			if (pattern.every((t, j) => t === tokens[i + j])) {
				matches.push({ start: i, length: pattern.length });
			}
		}
		if (atBeginningOnly && !matches.some((m) => m.start === 0)) return [];
		return matches;
	}

	function buildSegments(n: number, matches: SubProgressionMatch[]): Segment[] {
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

	const groupedSongs = $derived.by((): GroupedSong[] => {
		const map = new Map<string, GroupedSong>();
		for (const song of songs) {
			if (!song.romanTokens?.length) continue;
			const key = song.songKey ?? song.id ?? song.title;
			if (!map.has(key)) {
				const baseTitle =
					song.title.replace(/\s*\([^)]*\)\s*$/, "").trim() || song.title;
				map.set(key, {
					songKey: key,
					title: baseTitle,
					artists: song.artists,
					year: song.year,
					source: song.source,
					popularityScore: song.popularityScore,
					inTop10: song.inTop10,
					inTop40: song.inTop40,
					inTop100: song.inTop100,
					sections: []
				});
			}
			const labelMatch = song.title.match(/\(([^)]*)\)\s*$/);
			map.get(key)!.sections.push({
				label: labelMatch ? labelMatch[1] : null,
				tokens: song.romanTokens
			});
		}
		return [...map.values()]
			.map((song) => ({
				...song,
				sections: [...song.sections].sort(
					(a, b) => sectionRank(a.label) - sectionRank(b.label)
				)
			}))
			.sort((a, b) => {
				const aRank = a.inTop10 ? 3 : a.inTop40 ? 2 : a.inTop100 ? 1 : 0;
				const bRank = b.inTop10 ? 3 : b.inTop40 ? 2 : b.inTop100 ? 1 : 0;
				if (bRank !== aRank) return bRank - aRank;
				return (b.popularityScore ?? 0) - (a.popularityScore ?? 0);
			});
	});

	const filteredSongs = $derived.by(() => {
		const q = titleFilter.trim().toLowerCase();
		if (!q) return groupedSongs;
		return groupedSongs.filter(
			(s) =>
				s.title.toLowerCase().includes(q) ||
				s.artists.some((a) => a.toLowerCase().includes(q))
		);
	});

	const totalPages = $derived(Math.ceil(filteredSongs.length / PAGE_SIZE));

	const pageSongs = $derived.by((): ProcessedSong[] => {
		const opts = { minLength: minNumChords, matchAtLeastTwice };
		const atBeginningOnly = matchAtBeginningOnly;
		const start = page * PAGE_SIZE;
		return filteredSongs.slice(start, start + PAGE_SIZE).map((song) => {
			// First pass: assign a unique color to each distinct progression in this song.
			const patternColorMap = new Map<string, string>();
			for (const section of song.sections) {
				const pattern = fundamentalAttributionForSong(section, song.sections, opts);
				if (!pattern) continue;
				const key = pattern.join("→");
				if (!patternColorMap.has(key)) {
					patternColorMap.set(key, PROGRESSION_COLORS[patternColorMap.size % PROGRESSION_COLORS.length]);
				}
			}

			const sections: ProcessedSection[] = song.sections.map((section) => {
				const pattern = fundamentalAttributionForSong(section, song.sections, opts);
				const matches = pattern
					? findTokenMatches(section.tokens, pattern, atBeginningOnly)
					: [];
				const segments = buildSegments(section.tokens.length, matches);
				const color = pattern ? (patternColorMap.get(pattern.join("→")) ?? null) : null;
				return { ...section, pattern, matches, segments, color };
			});
			const totalMatchCount = sections.reduce((s, sec) => s + sec.matches.length, 0);

			const progMap = new Map<string, SongProgression>();
			for (const sec of sections) {
				if (!sec.pattern || sec.matches.length === 0) continue;
				const key = sec.pattern.join("→");
				const existing = progMap.get(key);
				if (existing) {
					existing.count += sec.matches.length;
				} else {
					progMap.set(key, {
						label: key,
						tokens: sec.pattern,
						count: sec.matches.length,
						color: patternColorMap.get(key) ?? "#a1a1aa"
					});
				}
			}
			const progressions = [...progMap.values()].sort((a, b) => b.count - a.count);

			return { ...song, sections, totalMatchCount, progressions };
		});
	});

	$effect(() => {
		titleFilter;
		matchAtLeastTwice;
		minNumChords;
		matchAtBeginningOnly;
		page = 0;
	});

	function prevPage() {
		if (page > 0) page--;
	}
	function nextPage() {
		if (page < totalPages - 1) page++;
	}
</script>

<div class="container">
	<div class="list-header">
		<h1 class="list-title">All songs</h1>
		<p class="list-meta">
			{#if songs.length === 0}
				Loading…
			{:else if filteredSongs.length === 0}
				No songs match
			{:else}
				{filteredSongs.length.toLocaleString()} songs · page {page + 1} of {totalPages}
			{/if}
		</p>
	</div>

	<input
		class="filter-input"
		type="search"
		placeholder="Filter by title or artist…"
		bind:value={titleFilter}
	/>

	<div class="songs">
		{#each pageSongs as song (song.songKey)}
			{@const youtubeUrl = buildYouTubeSearchUrl({
				title: song.title,
				artists: song.artists,
				year: song.year
			})}
			<div class="song-card" class:has-match={song.totalMatchCount > 0}>
				<div class="song-title-row">
					{#if song.source}
						<span class="source" title={SONG_DATA_SOURCE_TITLE[song.source]}
							>{song.source}</span
						>
					{/if}
					<a
						class="yt-link"
						href={youtubeUrl}
						target="_blank"
						rel="noopener noreferrer"
						title="Search on YouTube">🎵</a
					>
					<span class="song-name">{song.title}</span>
					{#if song.year !== undefined}
						<span class="year"> ({song.year})</span>
					{/if}
					<span class="artist"> — {song.artists.join(", ")}</span>
				</div>
				<div class="card-body">
					<div class="sections">
						{#each song.sections as section, si (si)}
							<div class="section-row" style:--hl={section.color}>
								{#if section.label}
									<span class="section-label">{section.label}</span>
								{/if}
								<div class="chords">
									{#each section.segments as segment, segi}
										{#if segment.matchIndex !== -1}
											<span class="match-group">
												{#each segment.indices as pos, i}
													<span class="chord highlighted">{section.tokens[pos]}</span>
													{#if i < segment.indices.length - 1}
														<span class="dot">·</span>
													{/if}
												{/each}
											</span>
										{:else}
											{#each segment.indices as pos, i}
												<span class="chord">{section.tokens[pos]}</span>
												{#if i < segment.indices.length - 1}
													<span class="dot">·</span>
												{/if}
											{/each}
										{/if}
										{#if segi < section.segments.length - 1}
											<span class="dot">·</span>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
					{#if song.progressions.length > 0}
						<div class="prog-panel">
							{#each song.progressions as prog}
								<div class="prog-item">
									<span
										class="prog-label"
										style:color={prog.color}
									>{prog.label}</span>
									<span class="prog-count">×{prog.count}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if totalPages > 1}
		<div class="pagination">
			<button class="page-btn" onclick={prevPage} disabled={page === 0}>← prev</button>
			<span class="page-info">{page + 1} / {totalPages}</span>
			<button class="page-btn" onclick={nextPage} disabled={page >= totalPages - 1}
				>next →</button
			>
		</div>
	{/if}
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.list-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.list-title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.list-meta {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.filter-input {
		width: 100%;
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

	.song-card.has-match {
		background: rgba(30, 27, 75, 0.2);
		border-color: rgba(49, 46, 129, 0.4);
	}

	.song-title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.125rem;
	}

	.card-body {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.source {
		font-size: 0.5625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #52525b;
		line-height: 1;
	}

	.yt-link {
		font-size: 0.625rem;
		line-height: 1;
		text-decoration: none;
		opacity: 0.55;
		transition: opacity 0.15s;
	}

	.yt-link:hover {
		opacity: 1;
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
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.prog-panel {
		flex-shrink: 0;
		width: 11rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
		border-left: 1px solid rgba(39, 39, 42, 0.7);
		padding-left: 0.625rem;
	}

	.prog-item {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.375rem;
	}

	.prog-label {
		font-size: 0.6875rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.prog-count {
		font-size: 0.5625rem;
		color: #52525b;
		flex-shrink: 0;
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
		color: var(--hl, #a1a1aa);
		background: rgba(255, 255, 255, 0.07);
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.match-group {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		border: 1px solid var(--hl, rgba(99, 102, 241, 0.55));
		border-radius: 0.375rem;
		padding: 0.2rem;
		opacity: 0.85;
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
		transition: color 0.12s, border-color 0.12s, background 0.12s;
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

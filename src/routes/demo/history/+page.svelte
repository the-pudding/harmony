<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { openDefineChordProgressionSong } from "../shared/defineChordProgressionSongUrl.js";
	import CorpusMatchRateOverTimeChart from "../core-progressions/CorpusMatchRateOverTimeChart.svelte";
	import type { YearDomain } from "../shared/artists/artistStats.js";
	import { computeDecadeHistory } from "./decadeSignatures.js";
	import {
		computeCadenceHistory,
		computeProgressionCadenceHistory
	} from "./cadenceAnalysis.js";
	import {
		computeChordComplexityHistory,
		computeProgressionCountHistory
	} from "./complexityAnalysis.js";
	import {
		computeBluesEraHistory,
		computeNamedProgressionEraHistory
	} from "./eraAnalysis.js";
	import { allProgressionGroups } from "$data/core-progressions.js";
	import DecadeLineChart, { type DecadeSeries } from "./DecadeLineChart.svelte";

	const PERFECT_COLOR = "#60a5fa";
	const PLAGAL_COLOR = "#fb923c";
	const OTHER_RESOLVING_COLOR = "#34d399";
	const NON_RESOLVING_COLOR = "#71717a";
	const RESOLVING_COLOR = "#4ade80";
	const CHORDS_COLOR = "#60a5fa";
	const PROGRESSIONS_COLOR = "#a78bfa";
	const NON_DIATONIC_TOKEN_COLOR = "#f472b6";
	const NON_DIATONIC_SONG_COLOR = "#fb923c";
	const BLUES_COLOR = "#eab308";
	const DOO_WOP_COLOR = "#ec4899";
	const AXIS_COLOR = "#38bdf8";

	const AXIS_FAMILY_NAMES = new Set(
		allProgressionGroups.find((g) => g.name === "Axis of awesome")!.progressions.map(
			(p) => p.name
		)
	);

	const coverage = createAllSongsCoverageState();

	const songByKey = $derived(
		new Map(coverage.baseList.map((song) => [song.songKey, song]))
	);

	const yearDomain = $derived.by((): YearDomain | null => {
		const years = coverage.baseList.flatMap((song) =>
			song.year === undefined ? [] : [song.year]
		);
		return years.length === 0
			? null
			: { min: Math.min(...years), max: Math.max(...years) };
	});

	const decadeHistory = $derived.by(() =>
		coverage.allSongsCoverageResult
			? computeDecadeHistory(
					coverage.allSongsCoverageResult.songCoverages,
					songByKey
				)
			: []
	);

	// Doesn't need core-progression matching at all — just each section's own
	// roman-numeral tokens — so it's available as soon as songs load, without
	// waiting on the (slower) coverage computation.
	const cadenceHistory = $derived(computeCadenceHistory(coverage.baseList));

	const cadenceShareOfAllSections = $derived.by((): DecadeSeries[] => [
		{
			label: "perfect (V→I)",
			color: PERFECT_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.perfectPercent
			}))
		},
		{
			label: "plagal (IV→I)",
			color: PLAGAL_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.plagalPercent
			}))
		},
		{
			label: "other resolving",
			color: OTHER_RESOLVING_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.otherResolvingPercent
			}))
		},
		{
			label: "non-resolving",
			color: NON_RESOLVING_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.nonResolvingPercent
			}))
		}
	]);

	const cadenceShareOfResolving = $derived.by((): DecadeSeries[] => [
		{
			label: "perfect (V→I)",
			color: PERFECT_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.perfectShareOfResolving
			}))
		},
		{
			label: "plagal (IV→I)",
			color: PLAGAL_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.plagalShareOfResolving
			}))
		},
		{
			label: "other resolving",
			color: OTHER_RESOLVING_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.otherShareOfResolving
			}))
		}
	]);

	// Progression cadence: how each distinct matched chord progression ends,
	// counted once per song regardless of repeats (see cadenceAnalysis.ts).
	// Needs the matcher's output, so it waits on coverage like the
	// signature-progression section below, unlike the section-ending charts
	// above which only need each section's own roman-numeral tokens.
	const progressionCadenceHistory = $derived.by(() =>
		coverage.allSongsCoverageResult
			? computeProgressionCadenceHistory(
					coverage.allSongsCoverageResult.songCoverages,
					songByKey
				)
			: []
	);

	const progressionCadenceShareOfAll = $derived.by((): DecadeSeries[] => [
		{
			label: "perfect (V→I)",
			color: PERFECT_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.perfectPercent
			}))
		},
		{
			label: "plagal (IV→I)",
			color: PLAGAL_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.plagalPercent
			}))
		},
		{
			label: "other resolving",
			color: OTHER_RESOLVING_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.otherResolvingPercent
			}))
		},
		{
			label: "non-resolving",
			color: NON_RESOLVING_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.nonResolvingPercent
			}))
		}
	]);

	const progressionCadenceShareOfResolving = $derived.by((): DecadeSeries[] => [
		{
			label: "perfect (V→I)",
			color: PERFECT_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.perfectShareOfResolving
			}))
		},
		{
			label: "plagal (IV→I)",
			color: PLAGAL_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.plagalShareOfResolving
			}))
		},
		{
			label: "other resolving",
			color: OTHER_RESOLVING_COLOR,
			points: progressionCadenceHistory.map((row) => ({
				decade: row.decade,
				value: row.otherShareOfResolving
			}))
		}
	]);

	// % of sections resolving to the tonic at all (any cadence type) — the
	// complement of cadenceHistory's non-resolving share, so no new
	// computation is needed, just a different way of looking at it.
	const resolvingPercentSeries = $derived.by((): DecadeSeries[] => [
		{
			label: "resolves to tonic",
			color: RESOLVING_COLOR,
			points: cadenceHistory.map((row) => ({
				decade: row.decade,
				value: 100 - row.nonResolvingPercent
			}))
		}
	]);

	// Chord vocabulary size and non-diatonic rate — per-song, per-token, no
	// matching needed, so available as soon as songs load.
	const chordComplexityHistory = $derived(
		computeChordComplexityHistory(coverage.baseList)
	);

	const chordsPerSongSeries = $derived.by((): DecadeSeries[] => [
		{
			label: "avg distinct chords / song",
			color: CHORDS_COLOR,
			points: chordComplexityHistory.map((row) => ({
				decade: row.decade,
				value: row.avgDistinctChords
			}))
		}
	]);

	const nonDiatonicSeries = $derived.by((): DecadeSeries[] => [
		{
			label: "% of chords that are non-diatonic",
			color: NON_DIATONIC_TOKEN_COLOR,
			points: chordComplexityHistory.map((row) => ({
				decade: row.decade,
				value: row.nonDiatonicTokenPercent
			}))
		},
		{
			label: "% of songs with ≥1 non-diatonic chord",
			color: NON_DIATONIC_SONG_COLOR,
			points: chordComplexityHistory.map((row) => ({
				decade: row.decade,
				value: row.songsWithNonDiatonicPercent
			}))
		}
	]);

	// Distinct progressions per song — needs the matcher's output.
	const progressionCountHistory = $derived.by(() =>
		coverage.allSongsCoverageResult
			? computeProgressionCountHistory(
					coverage.allSongsCoverageResult.songCoverages,
					songByKey
				)
			: []
	);

	const progressionsPerSongSeries = $derived.by((): DecadeSeries[] => [
		{
			label: "avg distinct progressions / song",
			color: PROGRESSIONS_COLOR,
			points: progressionCountHistory.map((row) => ({
				decade: row.decade,
				value: row.avgDistinctProgressions
			}))
		}
	]);

	const formatCount = (value: number): string => value.toFixed(1);

	// Blues shape (only major I/IV/V, nothing else) doesn't need matching —
	// available as soon as songs load.
	const bluesEraHistory = $derived(computeBluesEraHistory(coverage.baseList));

	// Doo wop and axis-of-awesome need the matcher's canonical progression
	// names, so they wait on coverage like the signature-progression section.
	const dooWopEraHistory = $derived.by(() =>
		coverage.allSongsCoverageResult
			? computeNamedProgressionEraHistory(
					coverage.allSongsCoverageResult.songCoverages,
					songByKey,
					new Set(["doo wop"])
				)
			: []
	);

	const axisEraHistory = $derived.by(() =>
		coverage.allSongsCoverageResult
			? computeNamedProgressionEraHistory(
					coverage.allSongsCoverageResult.songCoverages,
					songByKey,
					AXIS_FAMILY_NAMES
				)
			: []
	);

	const eraSeries = (
		label: string,
		color: string,
		rows: { decade: number; matchedPercent: number }[]
	): DecadeSeries[] => [
		{
			label,
			color,
			points: rows.map((row) => ({ decade: row.decade, value: row.matchedPercent }))
		}
	];

	const bluesEraSeries = $derived(
		eraSeries("% songs using only I/IV/V", BLUES_COLOR, bluesEraHistory)
	);
	const dooWopEraSeries = $derived(
		eraSeries("% songs matching doo wop", DOO_WOP_COLOR, dooWopEraHistory)
	);
	const axisEraSeries = $derived(
		eraSeries("% songs matching the axis family", AXIS_COLOR, axisEraHistory)
	);

	let expandedDecades = $state<Set<number>>(new Set());

	const toggleDecade = (decade: number) => {
		const next = new Set(expandedDecades);
		if (next.has(decade)) next.delete(decade);
		else next.add(decade);
		expandedDecades = next;
	};
</script>

<svelte:head>
	<title>harmony — history</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">History</h1>
			<p class="page-subtitle">How chord progressions have shifted, decade by decade</p>
		</div>

		<div class="controls">
			{#if coverage.loading}
				<span class="status-text">Loading song dataset…</span>
			{:else if coverage.loadError}
				<span class="status-text error">{coverage.loadError}</span>
			{:else if !coverage.allSongsCoverageResult}
				<span class="status-text">Computing coverage…</span>
			{:else}
				<span class="status-text"
					>{coverage.baseList.length.toLocaleString()} songs</span
				>
			{/if}
		</div>

		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Perfect vs. plagal cadences</h2>
				<p class="section-description">
					How each section ends: a perfect (authentic) cadence resolves V→I,
					a plagal ("amen") cadence resolves IV→I. Both require landing on a
					genuine, unaltered tonic — not a borrowed chord. Decades need at
					least 20 dated, classifiable sections to appear.
				</p>
			</div>

			{#if cadenceHistory.length === 0 && !coverage.loading}
				<p class="empty">Not enough dated songs to compute cadence trends.</p>
			{/if}

			<h3 class="subsection-title">By section ending</h3>
			<p class="subsection-description">
				Looking at how each verse/chorus/bridge/etc. section literally ends —
				one data point per section.
			</p>
			<div class="cadence-charts">
				<DecadeLineChart
					title="Cadence type, as a share of all sections"
					description="Perfect and plagal cadences both decline in absolute terms as more sections simply don't resolve to the tonic at all."
					series={cadenceShareOfAllSections}
				/>
				<DecadeLineChart
					title="Among only sections that do resolve, which cadence wins"
					description="Isolates the style of resolution from whether a section resolves at all — the plagal cadence overtakes the perfect cadence by the 2010s."
					series={cadenceShareOfResolving}
				/>
			</div>

			<h3 class="subsection-title">By chord progression</h3>
			<p class="subsection-description">
				Looking instead at how each distinct matched chord progression ends —
				every progression the matcher finds, named or not, counted once per
				song regardless of how many times it repeats within that song (so a
				12x-looped chorus doesn't outweigh a progression stated twice).
				Cadence is classified from the literal shape each song actually
				matched, not a progression's canonical spelling — matching is tonic-
				rotation-invariant, so the same progression can genuinely resolve in
				one song's key and not another's.
			</p>
			{#if progressionCadenceHistory.length === 0 && coverage.allSongsCoverageResult}
				<p class="empty">Not enough dated progression matches to compute cadence trends.</p>
			{/if}
			<div class="cadence-charts">
				<DecadeLineChart
					title="Cadence type, as a share of all matched progressions"
					description="Same question, but weighted by distinct progression instead of by section."
					series={progressionCadenceShareOfAll}
				/>
				<DecadeLineChart
					title="Among only progressions that do resolve, which cadence wins"
					description="The progression-level view of the same style-of-resolution question."
					series={progressionCadenceShareOfResolving}
				/>
			</div>
		</section>

		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Harmonic complexity over time</h2>
				<p class="section-description">
					Has music gotten more complex? Four different angles: how many
					distinct chords a song uses, how many distinct progressions it
					uses, how often a section actually resolves to the tonic, and how
					often a chord is borrowed from outside the home scale.
				</p>
			</div>

			{#if chordComplexityHistory.length === 0 && !coverage.loading}
				<p class="empty">Not enough dated songs to compute complexity trends.</p>
			{/if}

			<div class="cadence-charts">
				<DecadeLineChart
					title="Distinct chords per song"
					description="Average number of distinct chords (by degree, quality, and accidental — extensions like 7ths don't count as a new chord) a song uses."
					series={chordsPerSongSeries}
					formatValue={formatCount}
					yMaxBaseline={1}
				/>
				<DecadeLineChart
					title="Distinct progressions per song"
					description="Average number of distinct chord-progression shapes the matcher finds per song, core-named or not."
					series={progressionsPerSongSeries}
					formatValue={formatCount}
					yMaxBaseline={1}
				/>
				<DecadeLineChart
					title="Sections resolving to the tonic"
					description="Share of sections whose last chord is a genuine, unaltered tonic — any cadence type, not just perfect/plagal."
					series={resolvingPercentSeries}
				/>
				<DecadeLineChart
					title="Non-diatonic (borrowed) chords"
					description="A chord is non-diatonic when its root is altered (bVII, #IV) or its quality doesn't match what's diatonic for its degree in that section's scale (e.g. a minor iv or major III in a major key)."
					series={nonDiatonicSeries}
				/>
			</div>
		</section>

		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Do these "eras" actually dominate their decade?</h2>
				<p class="section-description">
					Three anecdotal chord-progression eras, checked against the corpus:
					blues (songs built on nothing but major I/IV/V), doo-wop (I-vi-IV-V),
					and the "four-chord song" axis-of-awesome family (I-V-vi-IV and its
					rotations). Each really does rise, peak, and fall roughly where the
					folk history says it should.
				</p>
			</div>

			{#if bluesEraHistory.length === 0 && !coverage.loading}
				<p class="empty">Not enough dated songs to compute era trends.</p>
			{/if}

			<div class="cadence-charts">
				<DecadeLineChart
					title="Blues shape (only I, IV, V — nothing else)"
					description="Peaks in the 1950s at ~20% of songs, then declines almost every decade after."
					series={bluesEraSeries}
					formatValue={(v) => `${v.toFixed(1)}%`}
				/>
				<DecadeLineChart
					title="Doo-wop (I-vi-IV-V)"
					description="Peaks exactly in the 1950s — nearly 4x more common there than its overall average."
					series={dooWopEraSeries}
					formatValue={(v) => `${v.toFixed(1)}%`}
				/>
				<DecadeLineChart
					title="Axis of awesome family (I-V-vi-IV + rotations)"
					description="Climbs almost every decade from the 1960s on, peaking in the 2000s–2010s — the 'four-chord pop song' era."
					series={axisEraSeries}
					formatValue={(v) => `${v.toFixed(1)}%`}
				/>
			</div>
		</section>

		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Signature progressions by decade</h2>
				<p class="section-description">
					The three core progressions each decade leans on more than any
					other — ranked by how over-represented they are in that decade
					compared to their share across the whole corpus. Requires at least
					20 core-progression matches in a decade and 15 for an individual
					progression to qualify, so noisy, rare shapes don't win by chance.
				</p>
			</div>

			{#if decadeHistory.length === 0 && coverage.allSongsCoverageResult}
				<p class="empty">Not enough dated songs to compute decade signatures.</p>
			{/if}

			<div class="decades">
				{#each decadeHistory as decadeEntry (decadeEntry.decade)}
					{@const isExpanded = expandedDecades.has(decadeEntry.decade)}
					<div class="decade">
						<button
							type="button"
							class="decade-header"
							aria-expanded={isExpanded}
							onclick={() => toggleDecade(decadeEntry.decade)}
						>
							<span class="decade-toggle" class:decade-toggle-open={isExpanded}
								>▸</span
							>
							<h3 class="decade-title">{decadeEntry.decade}s</h3>
							<span class="decade-meta"
								>{decadeEntry.songCount.toLocaleString()} songs · {decadeEntry.totalCoreMatches.toLocaleString()}
								core matches</span
							>
						</button>

						{#if isExpanded}
						<div class="signatures">
							{#each decadeEntry.signatures as signature (signature.chordProgression)}
								<div class="signature-card">
									<div class="signature-head">
										<span class="signature-name"
											>{signature.name}</span
										>
										<span class="signature-chords"
											>{signature.chordProgression}</span
										>
										<span class="signature-distinctiveness"
											>{signature.distinctiveness.toFixed(1)}x more common
											here</span
										>
									</div>

									{#if signature.description}
										<p class="signature-description">{signature.description}</p>
									{/if}

									{#if signature.emblematicSongs.length > 0}
										<ul class="emblematic-songs">
											{#each signature.emblematicSongs as song (song.songKey)}
												<li>
													<button
														type="button"
														class="emblematic-song-button"
														onclick={() =>
															openDefineChordProgressionSong(song.songKey)}
													>
														<span class="song-title">{song.title}</span>
														<span class="song-artist"
															>— {song.artists.join(", ")}</span
														>
													</button>
												</li>
											{/each}
										</ul>
									{/if}

									<div class="signature-chart">
										<CorpusMatchRateOverTimeChart
											corpusSongs={coverage.allSongsCoverageResult?.songCoverages ??
												null}
											{songByKey}
											matchProgressions={[signature.name]}
											filtered={true}
											{yearDomain}
										/>
									</div>
								</div>
							{/each}
						</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
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
		padding: 1.5rem 12px 4rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 80rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.page-subtitle {
		margin: 0;
		font-size: 0.8rem;
		color: #a1a1aa;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		max-width: 48rem;
	}

	.section-title {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.section-description {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #a1a1aa;
	}

	.empty {
		font-size: 0.75rem;
		color: #71717a;
	}

	.cadence-charts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
		gap: 1.5rem;
	}

	.subsection-title {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a1a1aa;
	}

	.subsection-description {
		margin: -0.5rem 0 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #71717a;
		max-width: 48rem;
	}

	.decades {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.decade {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(63, 63, 70, 0.7);
	}

	.decade:first-child {
		padding-top: 0;
		border-top: none;
	}

	.decade-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		flex-wrap: wrap;
		width: 100%;
		border: none;
		background: transparent;
		padding: 0;
		margin: 0;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}

	.decade-toggle {
		display: inline-block;
		font-size: 1rem;
		color: #71717a;
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}

	.decade-toggle-open {
		transform: rotate(90deg);
	}

	.decade-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: #f4f4f5;
	}

	.decade-meta {
		font-size: 0.75rem;
		color: #71717a;
	}

	.signatures {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
	}

	.signature-card {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.signature-head {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.signature-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
		text-transform: lowercase;
	}

	.signature-chords {
		font-size: 0.7rem;
		color: #a1a1aa;
	}

	.signature-distinctiveness {
		margin-top: 0.25rem;
		font-size: 0.65rem;
		color: #6366f1;
		width: fit-content;
	}

	.signature-description {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.45;
		color: #a1a1aa;
	}

	.emblematic-songs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.emblematic-song-button {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: baseline;
		border: none;
		background: transparent;
		padding: 0;
		font-family: inherit;
		font-size: 0.7rem;
		cursor: pointer;
		text-align: left;
		color: #d4d4d8;
	}

	.emblematic-song-button:hover .song-title {
		text-decoration: underline;
	}

	.song-title {
		font-weight: 600;
		color: #f4f4f5;
	}

	.song-artist {
		color: #71717a;
	}

	.signature-chart {
		margin-top: 0.25rem;
	}
</style>

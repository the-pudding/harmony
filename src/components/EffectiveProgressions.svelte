<script>
	import coreProgressionsData from "$data/core-progressions.js";
	import { loadShardedSong } from "$data/hexMapSnapshot";
	import { toCalendarYear } from "$data/songYear";
	import { matchSongV2 } from "$routes/demo/match-algo-v2/match-algo-v2-logic/matchSongV2";
	import { DEFAULT_WEIGHTS } from "$routes/demo/match-algo-v2/match-algo-v2-logic/weights";
	import {
		computeSongHomogeneity,
		formatEffectiveProgressionCount
	} from "$routes/demo/shared/progressionHomogeneity";
	import {
		highlightPaletteFromColor,
		UNGROUPED_PROGRESSION_PALETTE
	} from "$routes/demo/define-chord-progression/components/progressionColors";
	import SongChordsDisplay from "$routes/demo/define-chord-progression/components/SongChordsDisplay.svelte";
	import ProgressionShareBar from "$routes/demo/harmony-map/components/ProgressionShareBar.svelte";
	import { mapColors } from "$runes/mapColors.svelte";

	let { songs = [], showEffective = true } = $props();

	const effectiveVisible = $derived(
		showEffective !== false && showEffective !== "false"
	);

	let loaded = $state({});
	let expanded = $state({});

	$effect(() => {
		let active = true;
		for (const songKey of songs) {
			if (songKey in loaded) continue;
			loadShardedSong(songKey).then((song) => {
				if (active) loaded[songKey] = song;
			});
		}
		return () => (active = false);
	});

	let analyses = $derived(
		songs.map((songKey) => {
			const song = loaded[songKey];
			if (!song) return { songKey, song };
			const result = matchSongV2(song, coreProgressionsData, DEFAULT_WEIGHTS);
			return {
				songKey,
				song,
				result,
				homogeneity: computeSongHomogeneity(result.matches)
			};
		})
	);

	const colorByName = $derived(mapColors.byProgression);

	// label only the biggest slice that's a map cluster (shares come sorted)
	const segmentsFor = ({ result, homogeneity }) => {
		const shares = homogeneity?.progressionShares ?? [];
		const labeledName = shares.find(({ name }) => colorByName.has(name))?.name;
		return shares.map(({ name, share }) => ({
			name,
			percent: share * result.explainedPercent,
			color: colorByName.get(name),
			labeled: name === labeledName
		}));
	};

	const annotationsFor = ({ result }) =>
		result.annotations.map((annotation, i) => {
			const color = colorByName.get(result.matches[i]?.name);
			return {
				...annotation,
				palette: color
					? highlightPaletteFromColor(color)
					: UNGROUPED_PROGRESSION_PALETTE
			};
		});
</script>

<figure id="effective-progressions">
	{#each analyses as analysis (analysis.songKey)}
		{@const { songKey, song, homogeneity } = analysis}
		<section class="song">
			{#if song === undefined}
				<p class="muted">Loading…</p>
			{:else if song === null}
				<p class="muted">Couldn’t find {songKey}</p>
			{:else}
				<header>
					<div class="title-row">
						<span class="title">{song.title}</span>
						<span class="muted">
							{song.artists.join(", ")}
							{#if song.year !== undefined}({toCalendarYear(song.year)}){/if}
						</span>
					</div>
					{#if effectiveVisible && homogeneity}
						<div class="count">
							<strong
								>{formatEffectiveProgressionCount(
									homogeneity.effectiveProgressionCount
								)}</strong
							>
							<span class="muted">effective progressions</span>
						</div>
					{/if}
				</header>

				<div class="bar">
					<ProgressionShareBar segments={segmentsFor(analysis)} />
				</div>

				<button
					class="toggle"
					aria-expanded={!!expanded[songKey]}
					onclick={() => (expanded[songKey] = !expanded[songKey])}
				>
					{expanded[songKey] ? "Hide" : "Show"} chords
				</button>

				{#if expanded[songKey]}
					<div class="chords">
						<SongChordsDisplay
							{song}
							annotations={annotationsFor(analysis)}
							compact
						/>
					</div>
				{/if}
			{/if}
		</section>
	{/each}
</figure>

<style>
	figure {
		height: 100%;
		max-width: var(--col-width);
		margin: 0 auto;
		padding: 3rem 1rem 1rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		overflow-y: auto;
		/* the article is pointer-events: none; let the chords scroll */
		pointer-events: auto;
	}

	.song {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
	}

	.title-row {
		display: flex;
		flex-direction: column;
	}

	.title {
		font-weight: 600;
		font-size: var(--20px);
	}

	.muted {
		color: var(--color-gray-500);
		font-size: var(--14px);
	}

	.count {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		white-space: nowrap;
	}

	.count strong {
		font-family: var(--font-mono);
		font-size: var(--28px);
	}

	.bar {
		--bar-height: 1.5rem;
		--label-size-px: 12px;
		font-family: var(--font-mono);
	}

	.toggle {
		align-self: flex-start;
		font-family: var(--font-mono);
		font-size: var(--14px);
	}

	.chords {
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-gray-800);
	}
</style>

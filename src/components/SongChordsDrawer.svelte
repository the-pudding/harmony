<script lang="ts">
	// A side drawer with one song's full chords, plus links to more songs by
	// the same artists and to the songs most similar to it on the hex map.
	import { onMount, untrack } from "svelte";
	import { fly } from "svelte/transition";
	import coreProgressionsData from "$data/core-progressions.js";
	import {
		loadHexMapSnapshot,
		loadShardedSong,
		type HexMapSnapshot
	} from "$data/hexMapSnapshot.js";
	import type { GroupedSong } from "$data/songBrowser.js";
	import { toCalendarYear } from "$data/songYear.js";
	import { featuredSyncedSongs } from "$data/syncedSongs.js";
	import { similarSongs, songsFeaturingAny } from "$data/songNeighbors.js";
	import { mapColors } from "$runes/mapColors.svelte.js";
	import { matchSongV2 } from "$routes/demo/match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "$routes/demo/match-algo-v2/match-algo-v2-logic/weights.js";
	import {
		computeSongHomogeneity,
		formatEffectiveProgressionCount
	} from "$routes/demo/shared/progressionHomogeneity.js";
	import SongChordsDisplay from "$routes/demo/define-chord-progression/components/SongChordsDisplay.svelte";
	import ProgressionShareBar from "$routes/demo/harmony-map/components/ProgressionShareBar.svelte";

	type Props = {
		songId: string;
		onClose: () => void;
		// Called when a link in the drawer is clicked; the drawer then shows
		// that song.
		onPickSong: (songId: string) => void;
	};

	const { songId, onClose, onPickSong }: Props = $props();

	const FEATURED_EMOJI = "🎧";
	// At most this many songs, each at least this similar (cosine, 0 to 1).
	const SIMILAR_COUNT = 5;
	const SIMILAR_MIN_SCORE = 0.5;
	const FLY_X = 360;
	const featuredSongIds = new Set(
		featuredSyncedSongs.map((row) => row.songKey)
	);

	let currentSongId = $state(untrack(() => songId));

	let snapshot = $state.raw<HexMapSnapshot | null>(null);
	let song = $state.raw<GroupedSong | null>(null);
	let failed = $state(false);

	let closeButton = $state<HTMLButtonElement>();
	let returnFocusTo: Element | null = null;

	onMount(() => {
		returnFocusTo = document.activeElement;
		closeButton?.focus();
		let active = true;
		void loadHexMapSnapshot().then((loaded) => {
			if (active) snapshot = loaded;
		});
		return () => {
			active = false;
			if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
		};
	});

	$effect(() => {
		const id = currentSongId;
		song = null;
		failed = false;
		let active = true;
		loadShardedSong(id).then(
			(loaded) => {
				if (!active) return;
				song = loaded;
				failed = loaded === null;
			},
			() => {
				if (active) failed = true;
			}
		);
		return () => {
			active = false;
		};
	});

	const result = $derived(
		song ? matchSongV2(song, coreProgressionsData, DEFAULT_WEIGHTS) : null
	);
	const homogeneity = $derived(
		result ? computeSongHomogeneity(result.matches) : null
	);
	const segments = $derived(
		(homogeneity?.progressionShares ?? []).map(({ name, share }) => ({
			name,
			percent: share * (result?.explainedPercent ?? 0),
			color: mapColors.byProgression.get(name)
		}))
	);

	const summaryById = $derived(
		new Map(
			(snapshot?.songKeys ?? []).map((id, index) => [
				id,
				{
					title: snapshot!.titles[index],
					artists: snapshot!.artists[index],
					year: snapshot!.years?.[index] || undefined
				}
			])
		)
	);

	const currentSummary = $derived(summaryById.get(currentSongId));
	const title = $derived(song?.title ?? currentSummary?.title ?? "");
	const artists = $derived(song?.artists ?? currentSummary?.artists ?? []);
	const calendarYear = $derived(
		song?.year === undefined ? undefined : toCalendarYear(song.year)
	);

	// Other songs featuring any of the song's artists, oldest first.
	const otherSongs = $derived(
		snapshot ? songsFeaturingAny(snapshot, artists, currentSongId) : []
	);

	const similar = $derived(
		snapshot
			? similarSongs(snapshot, currentSongId, SIMILAR_COUNT, SIMILAR_MIN_SCORE)
			: []
	);

	const pick = (id: string) => {
		currentSongId = id;
		onPickSong(id);
	};

	const onWindowKeydown = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return;
		event.stopPropagation();
		onClose();
	};
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet songRow(id: string, showYear = false)}
	{@const summary = summaryById.get(id)}
	{#if summary}
		<li>
			<button type="button" onclick={() => pick(id)}>
				{#if featuredSongIds.has(id)}<span aria-label="has audio"
						>{FEATURED_EMOJI}</span
					>{/if}
				<span class="row-title">{summary.title}</span>
				<span class="muted">— {summary.artists.join(", ")}</span>
				{#if showYear}
					<span class="year muted">{summary.year ?? ""}</span>
				{/if}
			</button>
		</li>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" data-chords-drawer onclick={onClose}></div>

<div
	class="drawer"
	data-chords-drawer
	role="dialog"
	aria-modal="true"
	aria-labelledby="chords-drawer-title"
	transition:fly={{ x: FLY_X, duration: 250 }}
>
	<header>
		<div class="heading">
			<h2 id="chords-drawer-title">{title || "Loading…"}</h2>
			<div class="muted">
				{#if calendarYear !== undefined}({calendarYear}){/if}
				{artists.join(", ")}
			</div>
		</div>
		<button
			type="button"
			class="close"
			aria-label="Close"
			bind:this={closeButton}
			onclick={onClose}>✕</button
		>
	</header>

	<div class="body">
		{#if failed}
			<p class="muted">Couldn't load this song's chords.</p>
		{:else if !song || !result}
			<p class="muted">Loading chords…</p>
		{:else}
			<ProgressionShareBar {segments} />
			<p class="summary">
				<strong>{result.explainedPercent}%</strong> of song matched
				{#if homogeneity}
					with <strong
						>{formatEffectiveProgressionCount(
							homogeneity.effectiveProgressionCount
						)}</strong
					> effective progressions
				{/if}
			</p>
			<div class="chords">
				<SongChordsDisplay {song} annotations={result.annotations} />
			</div>
		{/if}

		{#if snapshot}
			<section>
				{#if similar.length > 0}
					<h3>Similar songs</h3>
					<ul>
						{#each similar as { songId: id } (id)}
							{@render songRow(id)}
						{/each}
					</ul>
				{:else}
					<p class="muted">(No sufficiently similar songs)</p>
				{/if}
			</section>
		{/if}

		<section>
			{#if otherSongs.length > 0}
				<h3>All {otherSongs.length} {artists.join(" & ")} songs in Top 20</h3>
				<ul>
					{#each otherSongs as id (id)}
						{@render songRow(id, true)}
					{/each}
				</ul>
			{:else if snapshot}
				<p class="muted">
					(No other songs featuring {artists.join(" or ")} in Top 20)
				</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: calc(var(--z-overlay) - 1);
		background: transparent;
	}

	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: var(--z-overlay);
		width: min(26rem, 100vw);
		display: flex;
		flex-direction: column;
		background: rgba(9, 9, 11, 0.88);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border-left: 1px solid rgba(255, 255, 255, 0.12);
		box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
		color: #e4e4e7;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1rem 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	h2 {
		margin: 0;
		font-size: 1.125rem;
		line-height: 1.25;
		color: #f4f4f5;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #a1a1aa;
	}

	.muted {
		color: #a1a1aa;
		font-size: 0.8125rem;
	}

	.close {
		flex: none;
		width: 2rem;
		height: 2rem;
		padding: 0;
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	/* flex items would otherwise shrink (and clip) when the body overflows */
	.body > :global(*) {
		flex: none;
	}

	.chords {
		max-height: 50svh;
		overflow-y: auto;
	}

	.summary {
		margin: 0;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.summary strong {
		color: #fff;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	li button {
		display: flex;
		gap: 0.375rem;
		width: 100%;
		text-align: left;
		border: none;
		background: transparent;
		padding: 0.3rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.8125rem;
		color: inherit;
		cursor: pointer;
	}

	li button:hover,
	li button:focus-visible {
		background: rgba(255, 255, 255, 0.08);
	}

	/* the year is a second column, pushed to the right edge */
	.year {
		margin-left: auto;
		flex: none;
		padding-left: 0.5rem;
		font-variant-numeric: tabular-nums;
	}

	.row-title {
		color: #f4f4f5;
	}
</style>

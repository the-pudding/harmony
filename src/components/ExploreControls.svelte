<script>
	import { getContext, onMount } from "svelte";
	import { loadHexMapSnapshot } from "$data/hexMapSnapshot.js";
	import { featuredSyncedSongs as reference } from "$data/syncedSongs";
	import {
		detectQuery,
		matchRank,
		progressionSpelling
	} from "$data/progressionQuery.js";

	const MAX_RESULTS = 12;
	const FEATURED_EMOJI = "🎧";

	const { pickSong, pickCluster } = getContext("explore");
	const featuredSongKeys = new Set(reference.map((d) => d.songKey));

	const normalize = (text) =>
		text
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.toLowerCase()
			.replace(/['’]/g, "")
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.trim();

	let songs = $state.raw([]);
	let clusters = $state.raw([]);
	let query = $state("");
	let open = $state(false);
	let activeIndex = $state(0);
	const listId = "explore-search-results";

	onMount(() => {
		loadHexMapSnapshot().then(
			({ songKeys, titles, artists, popularity, clusters: mapClusters }) => {
				songs = songKeys.map((songKey, i) => {
					const artist = artists[i].join(", ");
					return {
						songKey,
						title: titles[i],
						artist,
						popularity: popularity[i],
						featured: featuredSongKeys.has(songKey),
						searchTitle: normalize(titles[i]),
						searchArtist: normalize(artist),
						searchBoth: normalize(`${titles[i]} ${artist}`)
					};
				});
				// Far-away repeats share a name with a larger cluster (listed
				// first), and picking by name zooms to that one anyway.
				const seen = new Set();
				clusters = mapClusters.flatMap((cluster) => {
					if (!cluster.showLabel || seen.has(cluster.name)) return [];
					seen.add(cluster.name);
					return [
						{
							name: cluster.name,
							progressionNames: cluster.progressionNames,
							songCount: cluster.songIndexes.length
						}
					];
				});
			}
		);
	});

	const parsed = $derived(detectQuery(query));

	const songResults = (q) => {
		const words = q.split(" ");
		return songs
			.flatMap((song) => {
				if (!words.every((word) => song.searchBoth.includes(word))) return [];
				const startsWith = [
					song.searchTitle,
					song.searchArtist,
					song.searchBoth
				].some((text) => text.startsWith(q));
				return [{ song, rank: startsWith ? 0 : 1 }];
			})
			.sort((a, b) => a.rank - b.rank || b.song.popularity - a.song.popularity)
			.slice(0, MAX_RESULTS)
			.map(({ song }) => ({ type: "song", key: song.songKey, song }));
	};

	// Clusters whose progressions start with the query come first, then
	// ones that contain it; bigger clusters first within each.
	const clusterResults = (codes) =>
		clusters
			.flatMap((cluster) => {
				let best = null;
				for (const progressionName of cluster.progressionNames) {
					const rank = matchRank(codes, progressionName);
					if (rank !== null && (best === null || rank < best.rank))
						best = { rank, progressionName };
				}
				return best ? [{ cluster, ...best }] : [];
			})
			.sort((a, b) => a.rank - b.rank || b.cluster.songCount - a.cluster.songCount)
			.slice(0, MAX_RESULTS)
			.map(({ cluster, progressionName }) => ({
				type: "cluster",
				key: cluster.name,
				cluster,
				spelling: progressionSpelling(progressionName)
			}));

	const results = $derived.by(() => {
		if (parsed.kind !== "text") return clusterResults(parsed.codes);
		const q = normalize(query);
		return q ? songResults(q) : [];
	});

	$effect(() => {
		results;
		activeIndex = 0;
	});

	const choose = (result) => {
		open = false;
		if (result.type === "cluster") {
			query = result.cluster.name;
			pickCluster(result.cluster.name);
		} else {
			query = `${result.song.title} — ${result.song.artist}`;
			pickSong(result.song.songKey);
		}
	};

	const onKeyDown = (event) => {
		if (event.key === "Escape") {
			open = false;
			return;
		}
		if (!results.length) return;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			open = true;
			const step = event.key === "ArrowDown" ? 1 : -1;
			activeIndex = (activeIndex + step + results.length) % results.length;
		} else if (event.key === "Enter" && open) {
			event.preventDefault();
			choose(results[activeIndex]);
		}
	};
</script>

<div class="controls">
	<h2>Explore</h2>
	<div class="search">
		<input
			type="search"
			placeholder="Search artists and songs. Or, progressions: 'ii V I' or 'Dm G C'"
			autocomplete="off"
			spellcheck="false"
			role="combobox"
			aria-expanded={open && results.length > 0}
			aria-controls={listId}
			aria-activedescendant={open && results.length
				? `${listId}-${activeIndex}`
				: undefined}
			bind:value={query}
			oninput={() => (open = true)}
			onfocus={() => (open = true)}
			onblur={() => (open = false)}
			onkeydown={onKeyDown}
		/>
		{#if open && query.trim()}
			<ul id={listId} role="listbox">
				{#if parsed.kind !== "text"}
					<li class="heading" role="presentation">
						Progression: {parsed.romanTokens.join(" → ")}{#if parsed.keyLabel}
							<span class="key"> in {parsed.keyLabel}</span>{/if}
					</li>
				{/if}
				{#each results as result, i (result.key)}
					<li id="{listId}-{i}" role="option" aria-selected={i === activeIndex}>
						<button
							tabindex="-1"
							class:active={i === activeIndex}
							onmousedown={(event) => event.preventDefault()}
							onclick={() => choose(result)}
							onmouseenter={() => (activeIndex = i)}
						>
							{#if result.type === "cluster"}
								<span class="title">{result.cluster.name}</span>
								<span class="artist"
									>{result.spelling} · {result.cluster.songCount} songs</span
								>
							{:else}
								<span class="title"
									>{#if result.song.featured}<span
											class="featured"
											title="Featured: plays a clip">{FEATURED_EMOJI}</span
										>{" "}{/if}{result.song.title}</span
								>
								<span class="artist">{result.song.artist}</span>
							{/if}
						</button>
					</li>
				{:else}
					<li class="empty">
						{#if !songs.length}
							Loading songs…
						{:else if parsed.kind !== "text"}
							No clusters built on that progression
						{:else}
							No matches
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.search {
		margin-top: 0.75rem;
	}

	input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: var(--16px);
		color: var(--color-fg);
		background: rgb(0 0 0 / 0.5);
		border: 1px solid rgb(255 255 255 / 0.25);
		border-radius: 4px;
		text-overflow: ellipsis;
	}

	input:focus {
		outline: none;
		border-color: rgb(255 255 255 / 0.6);
	}

	input::-webkit-search-cancel-button {
		cursor: pointer;
	}

	ul {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0.25rem 0;
		max-height: 16rem;
		overflow-y: auto;
		pointer-events: auto;
		background: rgb(0 0 0 / 0.7);
		border: 1px solid rgb(255 255 255 / 0.15);
		border-radius: 4px;
		text-shadow: none;
	}

	li {
		margin: 0;
		padding: 0;
	}

	.search button {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 0;
		background: none;
		color: var(--color-fg);
		font-family: inherit;
		font-size: var(--14px);
		text-align: left;
		cursor: pointer;
	}

	.search button.active,
	.search button:hover {
		background: rgb(255 255 255 / 0.12);
		color: var(--color-fg);
	}

	.title {
		flex: none;
		max-width: 60%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.artist {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.6;
	}

	.heading {
		padding: 0.25rem 0.75rem 0.375rem;
		font-size: var(--12px, 0.75rem);
		letter-spacing: 0.02em;
		opacity: 0.7;
	}

	.key {
		opacity: 0.8;
	}

	.empty {
		padding: 0.375rem 0.75rem;
		font-size: var(--14px);
		opacity: 0.6;
	}
</style>

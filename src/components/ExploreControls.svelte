<script>
	import { getContext, onMount } from "svelte";
	import { loadHexMapSnapshot } from "$data/hexMapSnapshot.js";
	import reference from "$data/synced-songs/reference.csv";

	const MAX_RESULTS = 12;
	const FEATURED_EMOJI = "🎧";

	const { pickSong } = getContext("explore");
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
	let query = $state("");
	let open = $state(false);
	let activeIndex = $state(0);
	const listId = "explore-search-results";

	onMount(() => {
		loadHexMapSnapshot().then(({ songKeys, titles, artists }) => {
			songs = songKeys.map((songKey, i) => {
				const artist = artists[i].join(", ");
				return {
					songKey,
					title: titles[i],
					artist,
					featured: featuredSongKeys.has(songKey),
					searchTitle: normalize(titles[i]),
					searchArtist: normalize(artist),
					searchBoth: normalize(`${titles[i]} ${artist}`)
				};
			});
		});
	});

	const results = $derived.by(() => {
		const q = normalize(query);
		if (!q) return [];
		const words = q.split(" ");
		return songs
			.flatMap((song) => {
				if (!words.every((word) => song.searchBoth.includes(word))) return [];
				const startsWith = [
					song.searchTitle,
					song.searchArtist,
					song.searchBoth
				].some((text) => text.startsWith(q));
				return [{ song, rank: (song.featured ? 0 : 2) + (startsWith ? 0 : 1) }];
			})
			.sort((a, b) => a.rank - b.rank)
			.slice(0, MAX_RESULTS)
			.map((d) => d.song);
	});

	$effect(() => {
		results;
		activeIndex = 0;
	});

	const choose = (song) => {
		query = `${song.title} — ${song.artist}`;
		open = false;
		pickSong(song.songKey);
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
			placeholder="Search for a song or artist"
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
				{#each results as song, i (song.songKey)}
					<li id="{listId}-{i}" role="option" aria-selected={i === activeIndex}>
						<button
							tabindex="-1"
							class:active={i === activeIndex}
							onmousedown={(event) => event.preventDefault()}
							onclick={() => choose(song)}
							onmouseenter={() => (activeIndex = i)}
						>
							<span class="title"
								>{#if song.featured}<span
										class="featured"
										title="Featured: plays a clip">{FEATURED_EMOJI}</span
									>{" "}{/if}{song.title}</span
							>
							<span class="artist">{song.artist}</span>
						</button>
					</li>
				{:else}
					<li class="empty">
						{songs.length ? "No matches" : "Loading songs…"}
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

	.empty {
		padding: 0.375rem 0.75rem;
		font-size: var(--14px);
		opacity: 0.6;
	}
</style>

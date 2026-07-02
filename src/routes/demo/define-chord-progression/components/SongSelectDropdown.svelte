<script lang="ts">
	import type { GroupedSong } from "../../progressions/songBrowser.js";

	const SONG_SELECT_DROPDOWN_OPTION_LIMIT = 20;

	let {
		songs,
		selectedSong,
		selectedKey,
		searchQuery = $bindable(""),
		onSelectedKeyChange
	}: {
		songs: GroupedSong[];
		selectedSong: GroupedSong | null;
		selectedKey: string;
		searchQuery?: string;
		onSelectedKeyChange: (songKey: string) => void;
	} = $props();

	let isOpen = $state(false);
	const listboxId = `song-select-${Math.random().toString(36).slice(2)}`;

	const filteredOptions = $derived.by(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		const matching = normalizedQuery
			? songs.filter(
					(song) =>
						song.title.toLowerCase().includes(normalizedQuery) ||
						song.artists.some((artist) =>
							artist.toLowerCase().includes(normalizedQuery)
						)
				)
			: songs;
		const limited = matching.slice(0, SONG_SELECT_DROPDOWN_OPTION_LIMIT);
		if (
			selectedSong &&
			!limited.some((song) => song.songKey === selectedSong.songKey)
		) {
			return [selectedSong, ...limited];
		}
		return limited;
	});

	const displayValue = $derived(
		searchQuery || (selectedSong ? songLabel(selectedSong) : "")
	);

	const openDropdown = () => {
		isOpen = true;
	};

	const closeDropdown = () => {
		isOpen = false;
		searchQuery = "";
	};

	const selectSong = (songKey: string) => {
		onSelectedKeyChange(songKey);
		searchQuery = "";
		closeDropdown();
	};

	const handleInput = (value: string) => {
		searchQuery = value;
		openDropdown();
	};

	const handleFocus = () => {
		openDropdown();
	};

	const handleBlur = () => {
		requestAnimationFrame(() => {
			closeDropdown();
		});
	};

	function songLabel(song: GroupedSong): string {
		const year = song.year !== undefined ? ` (${song.year})` : "";
		return `${song.title}${year} — ${song.artists.join(", ")}`;
	}
</script>

<div class="song-select">
	<input
		class="song-input"
		type="search"
		role="combobox"
		aria-expanded={isOpen}
		aria-controls={listboxId}
		aria-autocomplete="list"
		placeholder="Search by title or artist…"
		value={displayValue}
		oninput={(event) => handleInput((event.currentTarget as HTMLInputElement).value)}
		onfocus={handleFocus}
		onblur={handleBlur}
	/>
	{#if isOpen && filteredOptions.length > 0}
		<ul class="song-options" id={listboxId} role="listbox">
			{#each filteredOptions as song (song.songKey)}
				<li role="presentation">
					<button
						type="button"
						class="song-option"
						class:selected={song.songKey === selectedKey}
						role="option"
						aria-selected={song.songKey === selectedKey}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => selectSong(song.songKey)}
					>
						{songLabel(song)}
					</button>
				</li>
			{/each}
		</ul>
	{:else if isOpen && searchQuery.trim()}
		<p class="song-empty">No songs match</p>
	{/if}
</div>

<style>
	.song-select {
		position: relative;
		flex: 1;
		min-width: 12rem;
	}

	.song-input {
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

	.song-input:focus {
		border-color: rgba(99, 102, 241, 0.6);
	}

	.song-input::placeholder {
		color: #52525b;
	}

	.song-options {
		position: absolute;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		z-index: 20;
		margin: 0;
		padding: 0.25rem 0;
		list-style: none;
		background: #18181b;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.35);
		max-height: 14rem;
		overflow-y: auto;
	}

	.song-option {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		color: #e4e4e7;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.8125rem;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	.song-option:hover,
	.song-option.selected {
		background: rgba(67, 56, 202, 0.25);
		color: #fff;
	}

	.song-empty {
		position: absolute;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		z-index: 20;
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: #18181b;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.35);
		color: #71717a;
		font-size: 0.8125rem;
	}
</style>

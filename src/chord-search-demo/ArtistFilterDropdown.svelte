<script lang="ts">
	import { ARTIST_FILTER_OPTION_LIMIT } from "./constants.js";
	import type { ArtistOption } from "./buildArtistOptions.js";

	let {
		artistOptions,
		selectedArtist,
		onSelectedArtistChange
	}: {
		artistOptions: ArtistOption[];
		selectedArtist: string;
		onSelectedArtistChange: (value: string) => void;
	} = $props();

	let query = $state("");
	let isOpen = $state(false);
	let listboxId = $state(`artist-filter-${Math.random().toString(36).slice(2)}`);

	const filteredOptions = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const matching = normalizedQuery
			? artistOptions.filter((option) =>
					option.name.toLowerCase().includes(normalizedQuery)
				)
			: artistOptions;
		return matching.slice(0, ARTIST_FILTER_OPTION_LIMIT);
	});

	const displayValue = $derived(selectedArtist || query);

	const openDropdown = () => {
		isOpen = true;
	};

	const closeDropdown = () => {
		isOpen = false;
	};

	const selectArtist = (name: string) => {
		onSelectedArtistChange(name);
		query = "";
		closeDropdown();
	};

	const clearSelection = () => {
		onSelectedArtistChange("");
		query = "";
		closeDropdown();
	};

	const handleInput = (value: string) => {
		query = value;
		if (selectedArtist) onSelectedArtistChange("");
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
</script>

<div class="artist-filter">
	<input
		class="artist-input"
		type="text"
		role="combobox"
		aria-expanded={isOpen}
		aria-controls={listboxId}
		aria-autocomplete="list"
		placeholder="Filter by artist…"
		value={displayValue}
		oninput={(event) => handleInput((event.currentTarget as HTMLInputElement).value)}
		onfocus={handleFocus}
		onblur={handleBlur}
	/>
	{#if selectedArtist}
		<button
			type="button"
			class="clear-artist"
			aria-label="Clear artist filter"
			onmousedown={(event) => event.preventDefault()}
			onclick={clearSelection}
		>
			×
		</button>
	{/if}
	{#if isOpen && filteredOptions.length > 0}
		<ul class="artist-options" id={listboxId} role="listbox">
			{#each filteredOptions as option (option.name)}
				<li role="presentation">
					<button
						type="button"
						class="artist-option"
						class:selected={option.name === selectedArtist}
						role="option"
						aria-selected={option.name === selectedArtist}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => selectArtist(option.name)}
					>
						{option.name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.artist-filter {
		position: relative;
		flex: 0 0 11rem;
		min-width: 0;
	}

	.artist-input {
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.375rem 1.75rem 0.375rem 0.625rem;
		width: 100%;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.15s;
	}

	.artist-input::placeholder {
		color: #52525b;
	}

	.artist-input:focus {
		border-color: rgba(99, 102, 241, 0.6);
	}

	.clear-artist {
		position: absolute;
		top: 50%;
		right: 0.375rem;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: #71717a;
		cursor: pointer;
		font-size: 0.875rem;
		line-height: 1;
		padding: 0.125rem;
	}

	.clear-artist:hover {
		color: #e4e4e7;
	}

	.artist-options {
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
		border-radius: 0.25rem;
		box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.35);
		max-height: 12rem;
		overflow-y: auto;
	}

	.artist-option {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		color: #e4e4e7;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.375rem 0.625rem;
		text-align: left;
	}

	.artist-option:hover,
	.artist-option.selected {
		background: rgba(67, 56, 202, 0.25);
		color: #fff;
	}
</style>

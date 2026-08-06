<script lang="ts">
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import ArtistProfile from "../shared/artists/ArtistProfile.svelte";
	import type {
		ArtistSummary,
		YearDomain
	} from "../shared/artists/artistStats.js";

	const PROGRESSION_LIMIT = 8;

	type Props = {
		rank: number;
		summary: ArtistSummary;
		songByKey: Map<string, GroupedSong>;
		yearDomain: YearDomain | null;
		pinnedProgression: string | null;
		selectedSongKey: string | null;
		onSelectProgression: (chordProgression: string) => void;
		onSelectSong: (songKey: string) => void;
	};

	const {
		rank,
		summary,
		songByKey,
		yearDomain,
		pinnedProgression,
		selectedSongKey,
		onSelectProgression,
		onSelectSong
	}: Props = $props();

	const highlightedProgressions = $derived(
		pinnedProgression === null ? null : [pinnedProgression]
	);
</script>

<section class="artist-section">
	<header class="artist-header">
		<span class="rank">#{rank}</span>
		<h2 class="artist-name">{summary.artistName}</h2>
	</header>

	<ArtistProfile
		{summary}
		{songByKey}
		{yearDomain}
		{selectedSongKey}
		{highlightedProgressions}
		{onSelectProgression}
		{onSelectSong}
		progressionLimit={PROGRESSION_LIMIT}
		layout="split"
	/>
</section>

<style>
	.artist-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 1.75rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.5);
	}

	.artist-header {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.rank {
		font-size: 0.75rem;
		color: #52525b;
	}

	.artist-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
	}
</style>

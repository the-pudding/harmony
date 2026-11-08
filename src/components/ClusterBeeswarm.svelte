<script>
	// The explore panel's beeswarm: a cluster's songs over time, colored as
	// on the map, with its playable songs labeled. Hovering a dot hovers
	// that song on the map.
	import { onMount } from "svelte";
	import ClusterYearBeeswarm from "$components/charts/ClusterYearBeeswarm.svelte";
	import {
		datedBeeswarmSongs,
		yearDomainOf
	} from "$components/charts/beeswarmSongs.js";
	import { loadHexMapSnapshot } from "$data/hexMapSnapshot.js";
	import { sameClusterName } from "$data/clusterName.js";
	import { featuredSongsOf } from "$data/featuredClusters.js";
	import { mapColors } from "$runes/mapColors.svelte.js";

	let {
		cluster,
		playingSongKey = null,
		// the song hovered on the map, ringed here too
		mapHoveredSongKey = null,
		// the song whose chords are open (one without a sample), ringed
		selectedSongKey = null,
		onHoverSong = null
	} = $props();

	let snapshot = $state.raw(null);

	onMount(() => {
		let active = true;
		void loadHexMapSnapshot().then((loaded) => {
			if (active) snapshot = loaded;
		});
		return () => {
			active = false;
		};
	});

	const summaryBySongKey = $derived(
		new Map(
			(snapshot?.songKeys ?? []).map((songKey, i) => [
				songKey,
				{ title: snapshot.titles[i], year: snapshot.years?.[i] || undefined }
			])
		)
	);

	const yearDomain = $derived(yearDomainOf(snapshot?.years ?? []));

	const maxSongCount = $derived(
		Math.max(0, ...(snapshot?.clusters ?? []).map((c) => c.songIndexes.length))
	);

	// Map clusters can repeat a name; the biggest is the one the map zooms
	// to (see findNamedCluster).
	const mapCluster = $derived(
		(snapshot?.clusters ?? [])
			.filter((c) => sameClusterName(c.name, cluster))
			.sort((a, b) => b.songIndexes.length - a.songIndexes.length)[0]
	);

	const songs = $derived(
		mapCluster && mapColors.bySong
			? datedBeeswarmSongs(
					mapCluster.songIndexes.map((i) => snapshot.songKeys[i]),
					(songKey) => summaryBySongKey.get(songKey),
					mapColors.bySong
				)
			: []
	);

	const annotations = $derived(
		featuredSongsOf(cluster).flatMap(({ songKey }) => {
			const title = summaryBySongKey.get(songKey)?.title;
			return title ? [{ songKey, label: title }] : [];
		})
	);
</script>

{#if yearDomain && songs.length > 0}
	<div class="cluster-beeswarm">
		<ClusterYearBeeswarm
			{songs}
			{yearDomain}
			{maxSongCount}
			{annotations}
			highlightedSongKey={playingSongKey}
			linkedSongKey={mapHoveredSongKey}
			{selectedSongKey}
			{onHoverSong}
		/>
	</div>
{/if}

<style>
	.cluster-beeswarm {
		width: 100%;
		max-width: 36rem;
		margin: 0 auto;
		padding: 0 1rem;
		box-sizing: border-box;
		font-family: var(--font-mono);
	}
</style>

import type { GroupedSong } from "../../../../data/songBrowser.js";
import { computeSongCoverage } from "../../define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { fetchArtistCatalogSongs } from "./fetchArtistCatalog.js";
import { buildArtistSummaries, type ArtistSummary } from "./artistStats.js";

export const createArtistFullCatalogState = (slug: string, artistName: string) => {
	let summary = $state<ArtistSummary | null>(null);
	let songByKey = $state<Map<string, GroupedSong>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loaded = false;

	const load = async () => {
		if (loaded || loading) return;
		loading = true;
		error = null;
		try {
			const songs = await fetchArtistCatalogSongs(slug);
			const byKey = new Map(songs.map((song) => [song.songKey, song]));
			const summaries = buildArtistSummaries(songs.map(computeSongCoverage), byKey);
			songByKey = byKey;
			summary =
				summaries.find((s) => s.artistName === artistName) ?? summaries[0] ?? null;
			loaded = true;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load full catalog";
		} finally {
			loading = false;
		}
	};

	return {
		get summary() {
			return summary;
		},
		get songByKey() {
			return songByKey;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		load
	};
};

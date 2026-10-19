import type { SyncedSongAudio } from "$data/syncedSongs.js";
import { currentSearchParams } from "../shared/currentSearchParams.js";
import { loadDesignSong, type DesignSong } from "./designSongs.js";
import { readDesignSongKey, replaceSongInUrl } from "./designUrlState.js";

// The song picked from `getOptions` (kept in the URL), loaded with its
// title, artist and key. Falls back to the first option.
export const createSongSelection = (getOptions: () => SyncedSongAudio[]) => {
	let pickedSongKey = $state(readDesignSongKey(currentSearchParams()));
	let song = $state.raw<DesignSong | null>(null);
	let loadError = $state("");

	const selected = $derived(
		getOptions().find((option) => option.songKey === pickedSongKey) ??
			getOptions()[0]
	);

	$effect(() => {
		const audio = selected;
		song = null;
		loadError = "";
		if (!audio) return;
		let isCurrent = true;
		loadDesignSong(audio)
			.then((loaded) => {
				if (isCurrent) song = loaded;
			})
			.catch((error: unknown) => {
				if (isCurrent)
					loadError = error instanceof Error ? error.message : String(error);
			});
		return () => {
			isCurrent = false;
		};
	});

	const select = (songKey: string) => {
		pickedSongKey = songKey;
		replaceSongInUrl(songKey);
	};

	return {
		get selectedSongKey() {
			return selected?.songKey;
		},
		get song() {
			return song;
		},
		get loadError() {
			return loadError;
		},
		select
	};
};

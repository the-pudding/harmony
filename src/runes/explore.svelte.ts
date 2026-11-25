// The story's exploring state, in one place: the cluster open in the
// panel, the sample playing, the song whose chords are open and the song
// picked in search. Index wires map and search events to these
// transitions; resolveClusterPick decides what a cluster pick does.
import { featuredClusterOf } from "$data/featuredClusters.js";
import { audio } from "$runes/audio.svelte.js";
import { resolveClusterPick } from "./explorePick.js";

export const createExplore = (options: { readonly exploreSlide: boolean }) => {
	const state = $state({
		// The cluster open in the panel, until the user pans or zooms.
		clusterName: undefined as string | undefined,
		playingSongKey: undefined as string | undefined,
		// The song whose full chords are open in the side drawer.
		chordsSongKey: undefined as string | undefined,
		// A song picked in search, which the map spotlights, until a pick
		// on the map, playing another song or opening other chords.
		searchedSongKey: undefined as string | undefined
	});

	return {
		get clusterName() {
			return state.clusterName;
		},
		get playingSongKey() {
			return state.playingSongKey;
		},
		// The player steps through its samples by setting this.
		set playingSongKey(songKey: string | undefined) {
			state.playingSongKey = songKey;
		},
		get chordsSongKey() {
			return state.chordsSongKey;
		},
		get searchedSongKey() {
			return state.searchedSongKey;
		},

		// A cluster picked on the map: its hex, its title, or a dot in it.
		pickCluster(clusterName: string | null, songKey: string | null = null) {
			const result = resolveClusterPick({
				clusterName,
				songKey,
				exploreSlide: options.exploreSlide
			});
			if (result.kind === "keep") return;
			state.searchedSongKey = undefined;
			// A hex or title click closes the chords; a dot's click opens
			// its own right after (see clickIntent).
			if (songKey === null) state.chordsSongKey = undefined;
			state.clusterName = result.clusterName;
			state.playingSongKey = result.playingSongKey;
		},

		// A sample's dot clicked on the map (or null to stop): plays it, or
		// stops it if it's already playing.
		playSong(songKey: string | null) {
			if (songKey !== null && songKey === state.playingSongKey) songKey = null;
			if (songKey !== state.searchedSongKey) state.searchedSongKey = undefined;
			state.chordsSongKey = undefined;
			state.playingSongKey = songKey ?? undefined;
			if (songKey) audio.muted = false;
		},

		stopPlaying() {
			state.playingSongKey = undefined;
		},

		toggleChords(songKey: string) {
			if (songKey !== state.searchedSongKey) state.searchedSongKey = undefined;
			state.chordsSongKey =
				state.chordsSongKey === songKey ? undefined : songKey;
			audio.muted = false;
		},

		openChords(songKey: string | undefined) {
			state.chordsSongKey = songKey;
		},

		// A song picked in search: its cluster opens in the panel as if its
		// dot were clicked (a sample also plays), and the map frames that
		// cluster (or the song, when it's in none).
		searchSong(songKey: string, clusterName: string | null = null) {
			audio.muted = false;
			const result = resolveClusterPick({
				clusterName,
				songKey,
				exploreSlide: options.exploreSlide
			});
			state.clusterName =
				result.kind === "set" ? result.clusterName : featuredClusterOf(songKey);
			state.playingSongKey =
				result.kind === "set" ? result.playingSongKey : undefined;
			state.searchedSongKey = songKey;
		},

		// The user panned or zoomed away.
		userMoved() {
			state.searchedSongKey = undefined;
			state.chordsSongKey = undefined;
			if (state.clusterName === undefined) return;
			state.clusterName = undefined;
			state.playingSongKey = undefined;
		},

		// A new slide starts with nothing explored, playing or open.
		reset() {
			state.clusterName = undefined;
			state.playingSongKey = undefined;
			state.chordsSongKey = undefined;
			state.searchedSongKey = undefined;
		}
	};
};

export type Explore = ReturnType<typeof createExplore>;

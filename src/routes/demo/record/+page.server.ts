import fs from "fs";
import path from "path";
import {
	parseSyncedSongAudioFile,
	FULL_SYNCED_SONG_DIRECTORY,
	type SyncedSongAudio
} from "$data/syncedSongs.js";
import { loadClusterIdeas } from "./loadClusterIdeas.server.js";
import { loadMapClusterNames } from "./mapClusters.server.js";
import type { PageServerLoad } from "./$types.js";

const AUDIO_DIRECTORY = path.join(process.cwd(), FULL_SYNCED_SONG_DIRECTORY);

// Every full song in full-synced-songs, one per song
// key. Read at prerender time for the static build, and per request in dev
// so newly added files show up on reload.
const listSyncedSongAudio = (): SyncedSongAudio[] => {
	const fileNames = fs.existsSync(AUDIO_DIRECTORY)
		? fs.readdirSync(AUDIO_DIRECTORY).sort()
		: [];
	const audio = fileNames.flatMap(
		(fileName) => parseSyncedSongAudioFile(fileName) ?? []
	);
	return audio.filter(
		(song, index) =>
			audio.findIndex((other) => other.songKey === song.songKey) === index
	);
};

export const load: PageServerLoad = () => ({
	syncedSongAudio: listSyncedSongAudio(),
	// The clusters the map draws, biggest first: what a synced song can join.
	clusterNames: loadMapClusterNames(),
	clusterIdeas: loadClusterIdeas()
});

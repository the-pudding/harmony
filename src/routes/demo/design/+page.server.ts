import fs from "fs";
import path from "path";
import {
	parseSyncedSongAudioFile,
	SYNCED_SONG_AUDIO_DIRECTORY,
	type SyncedSongAudio
} from "$data/syncedSongs.js";
import type { PageServerLoad } from "./$types.js";

const AUDIO_DIRECTORY = path.join(
	process.cwd(),
	"static",
	SYNCED_SONG_AUDIO_DIRECTORY
);

// Every song with audio in static/assets/audio/synced-songs, one per song
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
	syncedSongAudio: listSyncedSongAudio()
});

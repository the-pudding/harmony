export const DEFINE_CHORD_PROGRESSION_PATH = "/demo/define-chord-progression/";
export const DEFINE_CHORD_PROGRESSION_SONG_PARAM = "song";

export const buildDefineChordProgressionSongUrl = (songKey: string): string =>
	`${DEFINE_CHORD_PROGRESSION_PATH}?${DEFINE_CHORD_PROGRESSION_SONG_PARAM}=${encodeURIComponent(songKey)}`;

export const openDefineChordProgressionSong = (songKey: string): void => {
	window.open(buildDefineChordProgressionSongUrl(songKey), "_blank");
};

import { base } from "$app/paths";
import coreProgressions from "$data/core-progressions.js";
import type { SongInput } from "../../../chord-processing/types.js";
import type { ChordStartTimes } from "./chordStartTimes.js";
import type { SongSectionChords } from "./chordTimeline.js";
import { buildMatchedSongSections } from "./matchedSongSections.js";
import rubberBallChordStartTimes from "./data/bobby-vee__rubber-ball.chord-start-times.json";
import rubberBallSongInputs from "./data/bobby-vee__rubber-ball.song-inputs.json";

export type DesignSong = {
	songKey: string;
	title: string;
	artist: string;
	year: number;
	audioSrc: string;
	sections: SongSectionChords[];
	committedChordStartTimes: ChordStartTimes;
};

const DESIGN_SONG_DATA_DIRECTORY = "src/routes/demo/design/data";

const audioSrcForSongKey = (songKey: string): string =>
	`${base}/assets/audio/${songKey}.mp3`;

export const chordStartTimesFilePath = (songKey: string): string =>
	`${DESIGN_SONG_DATA_DIRECTORY}/${songKey}.chord-start-times.json`;

const RUBBER_BALL_SONG_KEY = "bobby-vee__rubber-ball";

export const rubberBall: DesignSong = {
	songKey: RUBBER_BALL_SONG_KEY,
	title: "Rubber Ball",
	artist: "Bobby Vee",
	year: 1960,
	audioSrc: audioSrcForSongKey(RUBBER_BALL_SONG_KEY),
	sections: buildMatchedSongSections(
		rubberBallSongInputs as SongInput[],
		coreProgressions
	),
	committedChordStartTimes: rubberBallChordStartTimes as ChordStartTimes
};

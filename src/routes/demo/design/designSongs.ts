import { base } from "$app/paths";
import coreProgressions from "$data/core-progressions.js";
import type { SongInput } from "../../../chord-processing/types.js";
import type { KeyTonality } from "./chord-viz/diatonicChords.js";
import type { SongSectionChords } from "./chordTimeline.js";
import {
	buildMatchedSongSections,
	songTonalityOf
} from "./matchedSongSections.js";
import rubberBallChordBeats from "./data/bobby-vee__rubber-ball.chord-beats.json";
import rubberBallSongInputs from "./data/bobby-vee__rubber-ball.song-inputs.json";

export type DesignSong = {
	songKey: string;
	title: string;
	artist: string;
	year: number;
	audioSrc: string;
	tonality: KeyTonality;
	sections: SongSectionChords[];
	committedChordBeats: unknown;
};

const DESIGN_SONG_DATA_DIRECTORY = "src/routes/demo/design/data";

const audioSrcForSongKey = (songKey: string): string =>
	`${base}/assets/audio/${songKey}.mp3`;

export const chordBeatsFilePath = (songKey: string): string =>
	`${DESIGN_SONG_DATA_DIRECTORY}/${songKey}.chord-beats.json`;

const RUBBER_BALL_SONG_KEY = "bobby-vee__rubber-ball";

export const rubberBall: DesignSong = {
	songKey: RUBBER_BALL_SONG_KEY,
	title: "Rubber Ball",
	artist: "Bobby Vee",
	year: 1960,
	audioSrc: audioSrcForSongKey(RUBBER_BALL_SONG_KEY),
	tonality: songTonalityOf(rubberBallSongInputs as SongInput[]),
	sections: buildMatchedSongSections(
		rubberBallSongInputs as SongInput[],
		coreProgressions
	),
	committedChordBeats: rubberBallChordBeats
};

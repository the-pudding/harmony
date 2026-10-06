import { base } from "$app/paths";
import type { SongSectionChords } from "./chordTimeline.js";
import rubberBallChords from "./data/bobby-vee__rubber-ball.json";

export type DesignSong = {
	songKey: string;
	title: string;
	artist: string;
	year: number;
	audioSrc: string;
	sections: SongSectionChords[];
};

const audioSrcForSongKey = (songKey: string): string =>
	`${base}/assets/audio/${songKey}.mp3`;

const RUBBER_BALL_SONG_KEY = "bobby-vee__rubber-ball";

export const rubberBall: DesignSong = {
	songKey: RUBBER_BALL_SONG_KEY,
	title: "Rubber Ball",
	artist: "Bobby Vee",
	year: 1960,
	audioSrc: audioSrcForSongKey(RUBBER_BALL_SONG_KEY),
	sections: rubberBallChords.sections
};

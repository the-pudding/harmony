import { noteToMidi } from "../chord-processing/chord-classifier/notes.js";
import type { Note, SongDataSource } from "../chord-processing/types.js";

export const SONG_DATA_SOURCE_TITLE: Record<SongDataSource, string> = {
	UG: "Ultimate Guitar",
	HT: "Hook Theory"
};

export { DEFAULT_SPLIT_BASS_NOTE as DEFAULT_SPLIT_NOTE } from "../chord-processing/chord-gater/index.js";

const SENTINEL_HALF_STEP_COUNT = 3;

const buildHalfStepSentinel = (noteName: Note["noteName"], octave: number) =>
	new Set(
		[...Array(SENTINEL_HALF_STEP_COUNT)].map(
			(_, offset) => noteToMidi({ noteName, octave }) + offset
		)
	);

export const CLEAR_SENTINEL_MIDIS = buildHalfStepSentinel("C", 2);
export const CLEAR_SENTINEL_LABEL = "delete";

export const PAUSE_SENTINEL_MIDIS = buildHalfStepSentinel("Bb", 4);
export const PAUSE_SENTINEL_LABEL = "pause";

export const SEARCH_INPUT_ACTIVE_LABEL = "taking search input";
export const SEARCH_INPUT_PAUSED_LABEL = "search input paused";
export const DEFAULT_SETTLE_MS = 60;
export const ESCAPE_KEY = "Escape";
export const SPLIT_NOTE_EDIT_TOOLTIP =
	"Click or play the new note you want to be the highest bass note before treble begins";

export const LIVE_STATE_MUTED = "muted";
export const LIVE_STATE_ACTIVE = "active";

export const SEARCH_PLACEHOLDER = "Play a chord to start searching…";
export const NO_MATCH_MESSAGE =
	"No songs match this progression. Clear to start over.";
export const SONGS_DATA_URL = "/data/songs.json";
export const SONGS_LOADING_MESSAGE = "Loading song dataset…";
export const MAX_SEARCH_RESULTS = 10;
export const ARTIST_FILTER_OPTION_LIMIT = 10;
export const TOP_NAV_FILTER_INPUT_HEIGHT = "1.875rem";
export const TOP_NAV_ARTIST_FILTER_WIDTH = "11rem";
export const TOP_NAV_SONG_FILTER_WIDTH = "8rem";
export const SONGS_LOAD_ERROR_PREFIX = "Could not load song dataset:";
export const EVENT_LOG_EMPTY = "Waiting for events…";

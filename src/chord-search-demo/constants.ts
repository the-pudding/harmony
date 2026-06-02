import {
	midiToNote,
	noteToMidi
} from "../chord-processing/chord-classifier/notes.js";
import type { Note, SongDataSource } from "../chord-processing/types.js";

export const SONG_DATA_SOURCE_TITLE: Record<SongDataSource, string> = {
	UG: "Ultimate Guitar",
	HT: "Hook Theory"
};

export { DEFAULT_SPLIT_BASS_NOTE as DEFAULT_SPLIT_NOTE } from "../chord-processing/chord-gater/index.js";

const SENTINEL_HALF_STEP_COUNT = 3;
const SENTINEL_NOTE_SEPARATOR = ",";

const buildHalfStepSentinel = (noteName: Note["noteName"], octave: number) =>
	new Set(
		[...Array(SENTINEL_HALF_STEP_COUNT)].map(
			(_, offset) => noteToMidi({ noteName, octave }) + offset
		)
	);

const formatSentinelNotes = (midis: Set<number>) =>
	[...midis]
		.sort((a, b) => a - b)
		.map((midi) => {
			const { noteName, octave } = midiToNote(midi);
			return `${noteName}${octave}`;
		})
		.join(SENTINEL_NOTE_SEPARATOR);

export const CLEAR_SENTINEL_MIDIS = buildHalfStepSentinel("C", 2);
export const CLEAR_SENTINEL_NOTES = formatSentinelNotes(CLEAR_SENTINEL_MIDIS);
export const CLEAR_SENTINEL_PIANO_LABEL = "clear";

export const PAUSE_SENTINEL_MIDIS = buildHalfStepSentinel("Bb", 4);
export const PAUSE_SENTINEL_NOTES = formatSentinelNotes(PAUSE_SENTINEL_MIDIS);
export const PAUSE_SENTINEL_PIANO_LABEL = "toggle input";

export const SEARCH_INPUT_ACTIVE_LABEL = "listening";
export const SEARCH_INPUT_PAUSED_LABEL = "input paused";
export const CLEAR_CHORDS_LABEL = "clear chords";
export const DEFAULT_SETTLE_MS = 60;
export const ESCAPE_KEY = "Escape";
export const SPLIT_NOTE_EDIT_TOOLTIP =
	"Click or play the new note you want to be the highest bass note before treble begins";

export const LIVE_STATE_MUTED = "muted";
export const LIVE_STATE_ACTIVE = "active";

export const SEARCH_PLACEHOLDER = "Play a chord to start searching…";
export const SEARCH_PLACEHOLDER_PAUSED = "Input paused. Enable input -->";
export const NO_MATCH_MESSAGE =
	"No songs match this progression. Clear to start over.";
export const SONGS_DATA_URL = "/data/songs.json";
export const SONGS_LOADING_MESSAGE = "Loading song dataset…";
export const MAX_SEARCH_RESULTS = 10;

export const VARIABLE_GRAM_MIN_LENGTH = 2;
export const VARIABLE_GRAM_MAX_LENGTH = 6;
export const MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_DEFAULT = 3;
export const MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MIN =
	VARIABLE_GRAM_MIN_LENGTH;
export const MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MAX =
	VARIABLE_GRAM_MAX_LENGTH;
export const MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_INPUT_WIDTH = "3.5rem";
export const CHORD_SEARCH_DEMO_HORIZONTAL_MARGIN_PX = 12;
export const SEQUENCE_CHART_TOP_N = 50;
export const SEQUENCE_CHART_TITLE = "Most common progressions";
export const SEQUENCE_CHART_SONG_APPEARANCES_COL_HEADER =
	"song appearance % and count";
export const SEQUENCE_CHART_ROW_FILTER_TOOLTIP =
	"Click the row to filter to it";
export const SEQUENCE_CHART_OCCURRENCE_SIGNIFICANT_FIGURES = 3;
export const SEQUENCE_CHART_PERCENT_SIGNIFICANT_FIGURES = 2;
export const sequenceChartMinLengthSubtitle = (minLength: number): string =>
	`${minLength} chords long or more`;

export const sequenceChartEffectiveMinLength = (
	minNumChordsToCountAsAProgression: number,
	searchChordCount: number
): number =>
	searchChordCount > 0
		? Math.max(minNumChordsToCountAsAProgression, searchChordCount)
		: minNumChordsToCountAsAProgression;

export const formatSequenceChartOccurrences = (count: number): string =>
	new Intl.NumberFormat(undefined, {
		maximumSignificantDigits: SEQUENCE_CHART_OCCURRENCE_SIGNIFICANT_FIGURES
	}).format(count);

export const formatSequenceChartPercent = (percent: number): string =>
	new Intl.NumberFormat(undefined, {
		maximumSignificantDigits: SEQUENCE_CHART_PERCENT_SIGNIFICANT_FIGURES
	}).format(percent);

export const FOUR_CHORDS_PROGRESSION_LABEL = "I→V→vi→IV";
export const SEQUENCE_CHART_TABLE_MARGIN_PX = 4;
export const SEQUENCE_CHART_COL_WEIGHTS = {
	rank: 0.3,
	sequence: 2,
	avgPct: 1.35,
	bar: 2
} as const;

export const SEQUENCE_CHART_COL_WEIGHT_SUM = Object.values(
	SEQUENCE_CHART_COL_WEIGHTS
).reduce((sum, weight) => sum + weight, 0);

export const sequenceChartColWidthPercent = (weight: number): string =>
	`${(weight / SEQUENCE_CHART_COL_WEIGHT_SUM) * 100}%`;

export const SEQUENCE_CHART_BAR_HEIGHT_PX = 30;
export const SEQUENCE_CHART_BAR_TRACK_HEIGHT_RATIO = 0.55;
export const SEQUENCE_CHART_BAR_MIN_WIDTH_PX = 2;
export const SEQUENCE_CHART_CHORD_CELL_WIDTH_PX = 32;
export const SEQUENCE_CHART_CHORD_SEPARATOR = "→";
export const SEQUENCE_CHART_VIEWPORT_HEIGHT_PX = 720;
export const SEQUENCE_CHART_AXIS_HEIGHT_PX = 24;
export const SEQUENCE_CHART_MARGIN_LEFT_PX = 8;
export const SEQUENCE_CHART_MARGIN_RIGHT_PX = 24;
export const SEQUENCE_CHART_MARGIN_TOP_PX = SEQUENCE_CHART_AXIS_HEIGHT_PX + 8;
export const SEQUENCE_CHART_MARGIN_BOTTOM_PX = 8;
export const SEQUENCE_CHART_AXIS_TICK_Y_PX = 16;
export const SEQUENCE_CHART_DEBOUNCE_MS = 200;
export const SEQUENCE_CHART_WORKER_POOL_MAX = 8;
export const SEQUENCE_CHART_WORKER_CHUNK_MIN_SECTIONS = 500;
export const SEQUENCE_CHART_EMPTY_MESSAGE =
	"No sections match the current filters.";
export const SEQUENCE_CHART_LOADING_MESSAGE = "Computing sequence statistics…";

export const SEQUENCE_CHART_LENGTH_COLORS: Record<number, string> = {
	2: "#89b4fa",
	3: "#a6e3a1",
	4: "#f5a97f",
	5: "#f38ba8",
	6: "#cba6f7"
};

export const SEQUENCE_CHART_HIGHLIGHT_COLOR = "#ffffff";
export const SEQUENCE_CHART_FALLBACK_BAR_COLOR = "#888888";
export const SEQUENCE_CHART_AVG_PCT_BAR_COLOR = "#52525b";
export const MATCHING_SONGS_TIME_SERIES_HEIGHT_PX = 120;
export const MATCHING_SONGS_TIME_SERIES_MARGIN_TOP_PX = 8;
export const MATCHING_SONGS_TIME_SERIES_MARGIN_RIGHT_PX = 8;
export const MATCHING_SONGS_TIME_SERIES_MARGIN_BOTTOM_PX = 28;
export const MATCHING_SONGS_TIME_SERIES_MARGIN_LEFT_PX = 36;
export const MATCHING_SONGS_TIME_SERIES_FILL_COLOR = "#4338ca";
export const MATCHING_SONGS_TIME_SERIES_STROKE_COLOR = "#6366f1";
export const MATCHING_SONGS_TIME_SERIES_EMPTY_MESSAGE =
	"No matching songs with release years in the current results.";
export const MATCHING_SONGS_TIME_SERIES_AXIS_TICK_COUNT = 5;

export const ARTIST_FILTER_OPTION_LIMIT = 10;
export const TOP_NAV_CHORD_SEARCH_GROUP_PADDING_Y = "0.375rem";
export const TOP_NAV_CHORD_SEARCH_GROUP_CONTENT_MIN_HEIGHT = "1.5rem";
export const TOP_NAV_CHORD_SEARCH_GROUP_HEIGHT = `calc(2 * ${TOP_NAV_CHORD_SEARCH_GROUP_PADDING_Y} + ${TOP_NAV_CHORD_SEARCH_GROUP_CONTENT_MIN_HEIGHT})`;
export const TOP_NAV_FILTER_INPUT_HEIGHT = TOP_NAV_CHORD_SEARCH_GROUP_HEIGHT;
export const TOP_NAV_ARTIST_FILTER_WIDTH = "11rem";
export const TOP_NAV_SONG_FILTER_WIDTH = "8rem";
export const SONGS_LOAD_ERROR_PREFIX = "Could not load song dataset:";
export const EVENT_LOG_EMPTY = "Waiting for events…";

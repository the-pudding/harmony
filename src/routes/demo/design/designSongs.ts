import { base } from "$app/paths";
import { applyHandReviewedCorrections } from "$data/applyHandReviewedCorrections.js";
import { songShardFor, songShardUrl } from "$data/hexMapSnapshot.js";
import { groupSongs } from "$data/songBrowser.js";
import {
	SYNCED_SONG_AUDIO_DIRECTORY,
	type SyncedSongAudio
} from "$data/syncedSongs.js";
import type { MusicalKey } from "../../../chord-processing/chordInKey.js";
import { SCALE_INTERVALS } from "../../../chord-processing/scale-intervals.js";
import { resolveSongKey } from "../../../chord-processing/songIdentity.js";
import type { SongInput } from "../../../chord-processing/types.js";
import { buildChordSheet, type ChordSheetSection } from "./chordSheet.js";

export type DesignSong = {
	songKey: string;
	audioFile: string;
	title: string;
	artist: string;
	year: number | null;
	audioSrc: string;
	// The key numerals are counted from until a recording picks its own.
	key: MusicalKey;
	chordSheet: ChordSheetSection[];
};

export const DEFAULT_KEY: MusicalKey = { tonic: "C", scale: "major" };

const audioSrcOf = (audioFile: string): string =>
	`${base}/${SYNCED_SONG_AUDIO_DIRECTORY}/${encodeURIComponent(audioFile)}`;

const titleCase = (slug: string): string =>
	slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

// The key most of the song's sections are in.
const corpusKeyOf = (songInputs: SongInput[]): MusicalKey => {
	const counts = new Map<string, { key: MusicalKey; count: number }>();
	songInputs.forEach(({ key: tonic, scale }) => {
		if (!tonic || !scale || !(scale in SCALE_INTERVALS)) return;
		const id = `${tonic} ${scale}`;
		const entry = counts.get(id) ?? {
			key: { tonic, scale } as MusicalKey,
			count: 0
		};
		counts.set(id, { ...entry, count: entry.count + 1 });
	});
	return (
		[...counts.values()].sort((a, b) => b.count - a.count)[0]?.key ??
		DEFAULT_KEY
	);
};

// Title, artist and key from the corpus; a song that isn't in it is named
// after its file and starts in C major.
export const buildDesignSong = (
	audio: SyncedSongAudio,
	songInputs: SongInput[]
): DesignSong => {
	const correctedInputs = applyHandReviewedCorrections(songInputs);
	const [groupedSong] = groupSongs(correctedInputs);
	const [artistSlug, titleSlug] = audio.songKey.split("__");
	return {
		songKey: audio.songKey,
		audioFile: audio.audioFile,
		title: groupedSong?.title ?? titleCase(titleSlug),
		artist: groupedSong?.artists.join(", ") ?? titleCase(artistSlug),
		year: groupedSong?.year === undefined ? null : Math.floor(groupedSong.year),
		audioSrc: audioSrcOf(audio.audioFile),
		key: corpusKeyOf(correctedInputs),
		chordSheet: groupedSong ? buildChordSheet(groupedSong.sections) : []
	};
};

// Every section of the song from its corpus shard.
const fetchSongInputs = async (songKey: string): Promise<SongInput[]> => {
	const response = await fetch(songShardUrl(songShardFor(songKey)));
	if (!response.ok) return [];
	const inputs = (await response.json()) as SongInput[];
	return inputs.filter((input) => resolveSongKey(input) === songKey);
};

export const loadDesignSong = async (
	audio: SyncedSongAudio
): Promise<DesignSong> =>
	buildDesignSong(audio, await fetchSongInputs(audio.songKey));

// "ben-e-king__stand-by-me" → "ben e king — stand by me", before the
// corpus has been loaded for a proper title.
export const songKeyLabel = (songKey: string): string => {
	const [artist, title] = songKey
		.split("__")
		.map((slug) => slug.replaceAll("-", " "));
	return `${artist} — ${title}`;
};

import type { PreparedSong, SongInput } from "./types.js";

const SONG_KEY_ID_PART_COUNT = 2;

export const resolveSongKey = (song: SongInput | PreparedSong): string => {
	if (song.songKey) return song.songKey;

	const idParts = song.id?.split("__") ?? [];
	if (idParts.length >= SONG_KEY_ID_PART_COUNT) {
		return `${idParts[0]}__${idParts[1]}`;
	}

	return `${song.title}__${song.artists.join("|")}`;
};

const SECTION_LABEL_SUFFIX_PATTERN = /^(.+) \(([^)]+)\)$/;

export const parseSongTitleAndSectionLabel = (
	title: string
): { baseTitle: string; sectionLabel: string | null } => {
	const match = title.match(SECTION_LABEL_SUFFIX_PATTERN);
	if (!match) return { baseTitle: title, sectionLabel: null };
	return { baseTitle: match[1], sectionLabel: match[2] };
};

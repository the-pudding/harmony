import type { SongInput } from "../chord-processing/types.js";

export type ArtistOption = {
	name: string;
	averagePopularityScore: number;
};

const songKey = (song: SongInput) => {
	const idParts = song.id?.split("__") ?? [];
	if (idParts.length >= 2) return `${idParts[0]}__${idParts[1]}`;
	return `${song.title}__${song.artists.join("|")}`;
};

export const buildArtistOptions = (songs: SongInput[]): ArtistOption[] => {
	const artistSongScores = new Map<string, Map<string, number>>();

	for (const song of songs) {
		const key = songKey(song);
		const score = song.popularityScore ?? 0;

		for (const artist of song.artists) {
			const scoresBySong = artistSongScores.get(artist) ?? new Map<string, number>();
			scoresBySong.set(key, Math.max(scoresBySong.get(key) ?? 0, score));
			artistSongScores.set(artist, scoresBySong);
		}
	}

	return [...artistSongScores.entries()]
		.map(([name, scoresBySong]) => {
			const scores = [...scoresBySong.values()];
			const averagePopularityScore =
				scores.reduce((total, score) => total + score, 0) / scores.length;
			return { name, averagePopularityScore };
		})
		.sort((a, b) => b.averagePopularityScore - a.averagePopularityScore);
};

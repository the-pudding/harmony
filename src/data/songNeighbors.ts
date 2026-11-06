// Neighbors of a song on the hex map: other songs by the same artists, and
// the songs closest to it in the vector space the map's UMAP runs on. That
// space is each song's progression coverage ("chords" weighting, no TF-IDF),
// compared here by cosine similarity over sparse vectors.
import type { HexMapSnapshot } from "./hexMapSnapshot.js";

export type SimilarSong = { songId: string; score: number };

type SparseVector = { entries: Map<number, number>; norm: number };

type NeighborIndex = {
	indexById: Map<string, number>;
	vectors: SparseVector[];
	// progression index -> songs (by position) that have it
	postings: Map<number, number[]>;
};

const indexCache = new WeakMap<HexMapSnapshot, NeighborIndex>();
const artistCache = new WeakMap<HexMapSnapshot, Map<string, string[]>>();

const buildIndex = (snapshot: HexMapSnapshot): NeighborIndex => {
	const indexById = new Map<string, number>();
	const postings = new Map<number, number[]>();
	const vectors = snapshot.songKeys.map((songId, position) => {
		indexById.set(songId, position);
		const flat = snapshot.progressions[position] ?? [];
		const entries = new Map<number, number>();
		for (let i = 0; i + 1 < flat.length; i += 2) {
			const value = flat[i + 1];
			if (value > 0) entries.set(flat[i], value);
		}
		let sumSquares = 0;
		for (const [progression, value] of entries) {
			sumSquares += value * value;
			const list = postings.get(progression);
			if (list) list.push(position);
			else postings.set(progression, [position]);
		}
		return { entries, norm: Math.sqrt(sumSquares) };
	});
	return { indexById, vectors, postings };
};

const indexFor = (snapshot: HexMapSnapshot): NeighborIndex => {
	let index = indexCache.get(snapshot);
	if (!index) {
		index = buildIndex(snapshot);
		indexCache.set(snapshot, index);
	}
	return index;
};

// Song ids by artist; a song with several artists is listed under each.
export const songsByArtist = (
	snapshot: HexMapSnapshot
): Map<string, string[]> => {
	let grouped = artistCache.get(snapshot);
	if (!grouped) {
		grouped = new Map();
		snapshot.songKeys.forEach((songId, position) => {
			for (const artist of snapshot.artists[position] ?? []) {
				const list = grouped!.get(artist);
				if (list) list.push(songId);
				else grouped!.set(artist, [songId]);
			}
		});
		artistCache.set(snapshot, grouped);
	}
	return grouped;
};

// Every song featuring any of these artists, except excludeSongId, oldest first
// (songs with an unknown year last, then by title).
export const songsFeaturingAny = (
	snapshot: HexMapSnapshot,
	artists: string[],
	excludeSongId?: string
): string[] => {
	const grouped = songsByArtist(snapshot);
	const ids = new Set(artists.flatMap((artist) => grouped.get(artist) ?? []));
	if (excludeSongId !== undefined) ids.delete(excludeSongId);
	const position = new Map(snapshot.songKeys.map((id, i) => [id, i]));
	const yearOf = (id: string): number =>
		snapshot.years?.[position.get(id)!] || Infinity;
	const titleOf = (id: string): string => snapshot.titles[position.get(id)!];
	return [...ids].sort(
		(a, b) =>
			(yearOf(a) === yearOf(b) ? 0 : yearOf(a) < yearOf(b) ? -1 : 1) ||
			titleOf(a).localeCompare(titleOf(b))
	);
};

// The k songs most similar to this one, best first. Never includes the song
// itself, nor songs sharing no progression with it, nor songs scoring below
// minScore (0 to 1).
export const similarSongs = (
	snapshot: HexMapSnapshot,
	songId: string,
	k = 8,
	minScore = 0
): SimilarSong[] => {
	const index = indexFor(snapshot);
	const position = index.indexById.get(songId);
	if (position === undefined) return [];
	const query = index.vectors[position];
	if (query.norm === 0) return [];

	const dots = new Map<number, number>();
	for (const [progression, value] of query.entries) {
		for (const other of index.postings.get(progression) ?? []) {
			if (other === position) continue;
			const otherValue = index.vectors[other].entries.get(progression)!;
			dots.set(other, (dots.get(other) ?? 0) + value * otherValue);
		}
	}

	return [...dots]
		.map(([other, dot]) => ({
			songId: snapshot.songKeys[other],
			score: dot / (query.norm * index.vectors[other].norm)
		}))
		.filter(({ score }) => score > 0 && score >= minScore)
		.sort((a, b) => b.score - a.score)
		.slice(0, k);
};

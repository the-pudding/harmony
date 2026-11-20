// Per-song transition staggers (0–1) that layouts hand to transitions.
import type { SongTable } from "../songTable.js";

// Oldest first; undated songs go first.
export const yearStagger = (songs: SongTable): Float32Array => {
	const stagger = new Float32Array(songs.count);
	let first = Infinity;
	let last = -Infinity;
	for (let index = 0; index < songs.count; index++) {
		const year = songs.year[index];
		if (year === 0) continue;
		first = Math.min(first, year);
		last = Math.max(last, year);
	}
	if (!(last > first)) return stagger;
	for (let index = 0; index < songs.count; index++) {
		const year = songs.year[index];
		stagger[index] = year === 0 ? 0 : (year - first) / (last - first);
	}
	return stagger;
};

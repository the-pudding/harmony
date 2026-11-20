// Per-song staggers (0–1, see STAGGER_SPAN) for layouts to hand to
// transitions into them: which songs set off first when the map changes
// arrangement.
import type { SongTable } from "../songTable.js";

// By release year, oldest first, so a change sweeps through time (left to
// right on the sky). Undated songs go first.
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

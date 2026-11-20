// The stage each song moves in when the map arrives at a scene's layout:
// each listed cluster's songs in turn, then everyone else. Names match
// exactly; a song in several listed clusters goes with the first.
import type { SongTable } from "./songTable.js";
import { warn } from "./mapScene.js";

export type RevealStages = {
	// Per song, 0 first; everyone else is in the last stage, count - 1.
	stageOf: Uint8Array;
	count: number;
};

// Null when no listed cluster exists; unknown names warn in dev.
export const revealStages = (
	songs: SongTable,
	clusterNames: readonly string[]
): RevealStages | null => {
	const known = clusterNames.filter((name) => {
		const exists = songs.clusterNames.includes(name);
		if (!exists) warn(`unknown revealClusters cluster "${name}" (ignored)`);
		return exists;
	});
	if (known.length === 0) return null;
	const stageOf = new Uint8Array(songs.count).fill(known.length);
	known.forEach((name, stage) => {
		songs.clusterNames.forEach((clusterName, cluster) => {
			if (clusterName !== name) return;
			for (const index of songs.clusterMembers[cluster]) {
				stageOf[index] = Math.min(stageOf[index], stage);
			}
		});
	});
	return { stageOf, count: known.length + 1 };
};

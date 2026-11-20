// The stage each song moves in when the map arrives at a scene's layout:
// the listed songs together, then each listed cluster's songs in turn, then
// everyone else. Cluster names match exactly; a song in several stages goes
// with the first.
import type { SongTable } from "./songTable.js";
import { warn, type MapScene } from "./mapScene.js";

export type RevealStages = {
	// Per song, 0 first; everyone else is in the last stage, count - 1.
	stageOf: Uint8Array;
	count: number;
};

// Null when no listed song or cluster exists; unknown ones warn in dev.
export const revealStages = (
	songs: SongTable,
	reveal: MapScene["reveal"]
): RevealStages | null => {
	const songIndexes = reveal.songs.flatMap((songKey) => {
		const index = songs.indexOf.get(songKey);
		if (index !== undefined) return [index];
		warn(`unknown revealSongs song "${songKey}" (ignored)`);
		return [];
	});
	const clusters = reveal.clusters.filter((name) => {
		const exists = songs.clusterNames.includes(name);
		if (!exists) warn(`unknown revealClusters cluster "${name}" (ignored)`);
		return exists;
	});
	const stages: (readonly number[])[] = [
		...(songIndexes.length > 0 ? [songIndexes] : []),
		...clusters.map((name) =>
			songs.clusterNames.flatMap((clusterName, cluster) =>
				clusterName === name ? songs.clusterMembers[cluster] : []
			)
		)
	];
	if (stages.length === 0) return null;
	const stageOf = new Uint8Array(songs.count).fill(stages.length);
	stages.forEach((members, stage) => {
		for (const index of members) {
			stageOf[index] = Math.min(stageOf[index], stage);
		}
	});
	return { stageOf, count: stages.length + 1 };
};

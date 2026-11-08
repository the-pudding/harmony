// A cluster as a color strategy sees it: its name (the key colors are
// returned under), the progressions that define it, where it sits on the
// map (mean normalized position of its songs) and how many songs it has.
export type ClusterColorInput = {
	name: string;
	progressionNames: readonly string[];
	x: number;
	y: number;
	weight: number;
};

// Picks one color per cluster, keyed by cluster name. Strategies see every
// cluster at once, so they can weigh a cluster against the rest of the map
// (e.g. rarity of its chords, or what its neighbors got).
export type ClusterColorStrategy = (
	clusters: readonly ClusterColorInput[]
) => Map<string, string>;

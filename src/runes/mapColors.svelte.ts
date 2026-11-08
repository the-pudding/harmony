// The hex map's color for each progression that a cluster is built on, as
// drawn by the story's HexMap, so other figures can color progressions to
// match the map. Empty until the map has loaded.
export const mapColors = $state({
	byProgression: new Map<string, string>() as ReadonlyMap<string, string>,
	// A song's dot color on the map, zoomed all the way in; null until the
	// map has loaded.
	bySong: null as ((songKey: string) => string) | null
});

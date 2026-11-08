// Data for ClusterYearBeeswarm, shared by the map's hex tooltip and the
// explore panel.

// A song in the beeswarm: when it came out, its dot color on the map, and
// its title (shown when hovered).
export type BeeswarmSong = {
	songKey: string;
	year: number;
	color: string;
	title?: string;
};

// A song labeled above the dots, with a line down to its dot.
export type BeeswarmAnnotation = { songKey: string; label: string };

export type YearDomain = { min: number; max: number };

// The dated songs among songKeys, colored by colorOf.
export const datedBeeswarmSongs = (
	songKeys: readonly string[],
	summaryOf: (songKey: string) => { year?: number; title?: string } | undefined,
	colorOf: (songKey: string) => string
): BeeswarmSong[] =>
	songKeys.flatMap((songKey) => {
		const summary = summaryOf(songKey);
		return summary?.year
			? [
					{
						songKey,
						year: summary.year,
						color: colorOf(songKey),
						title: summary.title
					}
				]
			: [];
	});

// The earliest and latest of these release years (skipping missing ones),
// so every beeswarm shares one time axis; null when there are none.
export const yearDomainOf = (
	years: Iterable<number | null | undefined>
): YearDomain | null => {
	let min = Infinity;
	let max = -Infinity;
	for (const year of years) {
		if (!year) continue;
		min = Math.min(min, year);
		max = Math.max(max, year);
	}
	return min <= max ? { min, max } : null;
};

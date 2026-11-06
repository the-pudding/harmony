// Recording ideas per cluster: groups of 3-5 songs that lean hard on the
// cluster's progression, share one key (so they can sit side by side in a
// synced comparison without transposing), and spread across decades.

// A song counts toward a cluster when the progression covers at least this
// much of its chords.
export const MIN_SHARE_PERCENT = 40;
export const MIN_GROUP_SIZE = 3;
export const MAX_GROUP_SIZE = 5;
export const KEY_IDEAS_PER_CLUSTER = 3;

const DECADE_YEARS = 10;

export type ClusterIdeaSong = {
	songKey: string;
	title: string;
	artists: string[];
	year: number;
	// Percent of the song's chords the cluster's progression covers.
	sharePercent: number;
	popularity: number;
};

export type ClusterIdeaCandidate = ClusterIdeaSong & {
	// One key for the whole song, e.g. "A major"; songs whose sections
	// disagree are left out before this point.
	keyLabel: string;
};

export type ClusterKeyIdea = {
	keyLabel: string;
	// Oldest first.
	songs: ClusterIdeaSong[];
	// Every other song in this key, strongest first, covers counted once.
	otherSongs: ClusterIdeaSong[];
	decadeCount: number;
	// Every song in the cluster in this key, before picking the group.
	candidateCount: number;
};

const decadeOf = (year: number): number =>
	Math.floor(year / DECADE_YEARS) * DECADE_YEARS;

// How well a song demonstrates the cluster: how much of it is the
// progression, weighted by how well known it is.
export const songStrength = (song: ClusterIdeaSong): number =>
	(song.sharePercent / 100) * Math.sqrt(song.popularity);

const normalizedTitle = (title: string): string =>
	title.toLowerCase().replace(/[^a-z0-9]/g, "");

const byStrength = (a: ClusterIdeaSong, b: ClusterIdeaSong): number =>
	songStrength(b) - songStrength(a);

// Strongest first. Covers of the same title count once.
const distinctByStrength = (songs: ClusterIdeaSong[]): ClusterIdeaSong[] => {
	const seenTitles = new Set<string>();
	return [...songs].sort(byStrength).filter((song) => {
		const title = normalizedTitle(song.title);
		if (seenTitles.has(title)) return false;
		seenTitles.add(title);
		return true;
	});
};

// With `spreadAcrossYears`, the strongest song from each decade first, so
// the group spans time, then the next strongest overall until there are
// enough. Without it, just the strongest songs. Covers of the same title
// count once.
export const pickKeyGroup = (
	songs: ClusterIdeaSong[],
	spreadAcrossYears = true
): ClusterIdeaSong[] => {
	const distinct = distinctByStrength(songs);

	if (!spreadAcrossYears) {
		return distinct
			.slice(0, MAX_GROUP_SIZE)
			.sort((a, b) => a.year - b.year);
	}

	const bestPerDecade = new Map<number, ClusterIdeaSong>();
	for (const song of distinct) {
		const decade = decadeOf(song.year);
		if (!bestPerDecade.has(decade)) bestPerDecade.set(decade, song);
	}

	const picked = [...bestPerDecade.values()]
		.sort(byStrength)
		.slice(0, MAX_GROUP_SIZE);
	for (const song of distinct) {
		if (picked.length >= MIN_GROUP_SIZE) break;
		if (!picked.includes(song)) picked.push(song);
	}
	return picked.sort((a, b) => a.year - b.year);
};

// The best keys for a cluster. With `spreadAcrossYears`, groups covering
// more decades rank first, then stronger songs; without it, strength alone.
export const buildClusterKeyIdeas = (
	candidates: ClusterIdeaCandidate[],
	spreadAcrossYears = true
): ClusterKeyIdea[] => {
	const byKey = new Map<string, ClusterIdeaSong[]>();
	for (const { keyLabel, ...song } of candidates) {
		if (song.sharePercent < MIN_SHARE_PERCENT) continue;
		byKey.set(keyLabel, [...(byKey.get(keyLabel) ?? []), song]);
	}

	const ideas = [...byKey].flatMap(([keyLabel, songs]): ClusterKeyIdea[] => {
		const group = pickKeyGroup(songs, spreadAcrossYears);
		if (group.length < MIN_GROUP_SIZE) return [];
		return [
			{
				keyLabel,
				songs: group,
				otherSongs: distinctByStrength(songs).filter(
					(song) => !group.includes(song)
				),
				decadeCount: new Set(group.map((song) => decadeOf(song.year))).size,
				candidateCount: songs.length
			}
		];
	});

	const totalStrength = (idea: ClusterKeyIdea): number =>
		idea.songs.reduce((sum, song) => sum + songStrength(song), 0);

	return ideas
		.sort(
			(a, b) =>
				(spreadAcrossYears ? b.decadeCount - a.decadeCount : 0) ||
				totalStrength(b) - totalStrength(a)
		)
		.slice(0, KEY_IDEAS_PER_CLUSTER);
};

export type ClusterIdeasByMode = {
	// Groups spread across decades.
	spread: Record<string, ClusterKeyIdea[]>;
	// The strongest songs, whenever they're from.
	strongest: Record<string, ClusterKeyIdea[]>;
};

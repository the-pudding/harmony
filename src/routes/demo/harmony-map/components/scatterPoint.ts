export type ScatterPoint = {
	songKey: string;
	x: number;
	y: number;
	z?: number;
	groupShares: { groupName: string; share: number }[];
};

export type ScatterAxisLabels = { x: string; y: string };

export const SCATTER_NORMAL_ALPHA = 0.8;
export const SCATTER_DIMMED_ALPHA = 0.18;

// Outside the year-range filter: lowest visibility (also used when nothing
// is selected / song is outside the focused cluster).
export const SCATTER_YEAR_OUT_ALPHA = 0.06;
// Outside the year range but inside the selected song's cluster — dimmer
// than in-year cluster mates, brighter than fully year-out songs.
export const SCATTER_YEAR_OUT_IN_CLUSTER_ALPHA = 0.4;

export type ScatterPointAlphaArgs = {
	songKey: string;
	hoveredSongKey: string | null;
	selectedSongKey: string | null;
	coClusterSongKeys: ReadonlySet<string>;
	highlightedSongKeys: ReadonlySet<string>;
	emphasizedSongKeys?: ReadonlySet<string> | null;
	inYearSongKeys?: ReadonlySet<string> | null;
};

export const scatterPointAlpha = ({
	songKey,
	hoveredSongKey,
	selectedSongKey,
	coClusterSongKeys,
	highlightedSongKeys,
	emphasizedSongKeys = null,
	inYearSongKeys = null
}: ScatterPointAlphaArgs): number => {
	if (hoveredSongKey === songKey) return 1;

	const inClusterFocus =
		selectedSongKey !== null &&
		(songKey === selectedSongKey || coClusterSongKeys.has(songKey));

	if (inYearSongKeys !== null && !inYearSongKeys.has(songKey)) {
		return inClusterFocus
			? SCATTER_YEAR_OUT_IN_CLUSTER_ALPHA
			: SCATTER_YEAR_OUT_ALPHA;
	}

	if (emphasizedSongKeys) {
		return emphasizedSongKeys.has(songKey) ? 1 : SCATTER_DIMMED_ALPHA;
	}

	if (selectedSongKey === null) {
		return highlightedSongKeys.has(songKey) ? 1 : SCATTER_NORMAL_ALPHA;
	}

	if (inClusterFocus) return 1;
	return SCATTER_DIMMED_ALPHA;
};

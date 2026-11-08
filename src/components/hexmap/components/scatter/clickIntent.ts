// What a click on the map does, as a list of actions for the component to
// run in order. Kept pure so every branch can be tested.

export type ClickInput = {
	// Zoomed out far enough in hex mode that hexes, not dots, are drawn.
	atHexZoom: boolean;
	hexMode: boolean;
	// The outlined song label under the pointer, when chords can be toggled
	// and dots are drawn.
	labelSongKey: string | null;
	// The outlined song under the pointer (dot zoom only).
	outlinedSongKey: string | null;
	// The song under the pointer, outlined ones first (dot zoom only).
	songKey: string | null;
	// The cluster clicked: the hex's, or at dot zoom the song's.
	regionName: string | null;
	// Whether there's a hex under the pointer (hex zoom only).
	onHex: boolean;
	playingSongKey: string | null;
	openSongId: string | null;
	selectedSongKey: string | null;
	canToggleChords: boolean;
	movable: boolean;
	hoverable: boolean;
};

export type ClickAction =
	| { kind: "toggleChords"; songKey: string }
	| { kind: "outlinedSongClick"; songKey: string | null }
	| { kind: "clusterClick"; name: string | null; songKey: string | null }
	| { kind: "zoomToHex" }
	| { kind: "select"; songKey: string | null };

export const resolveClick = (input: ClickInput): ClickAction[] => {
	const {
		atHexZoom,
		hexMode,
		labelSongKey,
		outlinedSongKey,
		songKey,
		playingSongKey
	} = input;

	// An outlined song's label opens or closes its chords, and nothing else.
	if (labelSongKey !== null) {
		return [{ kind: "toggleChords", songKey: labelSongKey }];
	}

	const atHexDots = hexMode && !atHexZoom;
	const songIsActive = playingSongKey !== null || input.openSongId !== null;
	// While a song plays or is open, clicking off any dot, or on the
	// playing one, just deselects.
	if (
		atHexDots &&
		songIsActive &&
		(songKey === null || songKey === playingSongKey)
	) {
		return [{ kind: "outlinedSongClick", songKey: null }];
	}

	const actions: ClickAction[] = [];
	if (outlinedSongKey !== null || songKey === null) {
		actions.push({ kind: "outlinedSongClick", songKey: outlinedSongKey });
	}

	// A plain song replaces whatever was playing, picks its cluster, and
	// opens its chords.
	if (
		atHexDots &&
		input.canToggleChords &&
		outlinedSongKey === null &&
		songKey !== null
	) {
		if (playingSongKey !== null) {
			actions.push({ kind: "outlinedSongClick", songKey: null });
		}
		actions.push({ kind: "clusterClick", name: input.regionName, songKey });
		actions.push({ kind: "toggleChords", songKey });
		return actions;
	}

	if (hexMode) {
		actions.push({
			kind: "clusterClick",
			name: input.regionName,
			songKey: outlinedSongKey
		});
	}

	// Clicking a hex zooms in on it just far enough to show dots.
	if (atHexZoom) {
		if (input.movable && input.onHex) actions.push({ kind: "zoomToHex" });
		return actions;
	}

	if (!input.hoverable) return actions;
	actions.push({
		kind: "select",
		songKey: songKey === input.selectedSongKey ? null : songKey
	});
	return actions;
};

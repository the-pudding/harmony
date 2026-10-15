export const DESIGN_TAB_DEMOS = "demos";
export const DESIGN_TAB_SYNCED_SONG_PLAYER = "synced-song-player";
export const DESIGN_TAB_CHORD_VIZ = "chord-viz";

export const DESIGN_TABS = [
	DESIGN_TAB_DEMOS,
	DESIGN_TAB_SYNCED_SONG_PLAYER,
	DESIGN_TAB_CHORD_VIZ
] as const;

export type DesignTab = (typeof DESIGN_TABS)[number];

export const DEFAULT_DESIGN_TAB: DesignTab = DESIGN_TAB_DEMOS;

export const DESIGN_TAB_LABELS: Record<DesignTab, string> = {
	[DESIGN_TAB_DEMOS]: "Demos",
	[DESIGN_TAB_SYNCED_SONG_PLAYER]: "Synced song player",
	[DESIGN_TAB_CHORD_VIZ]: "Chord viz experimentation"
};

export const isDesignTab = (value: string): value is DesignTab =>
	(DESIGN_TABS as readonly string[]).includes(value);

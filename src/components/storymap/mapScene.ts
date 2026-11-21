// A slide's map, typed. parseMapScene turns the flat `{.map}` keys from the
// copy (all strings) into a MapScene.
import type { CopyMap } from "$data/copy.json";
import type { YearSpan } from "./layouts/progressionOverTime.js";

export type MapScene = {
	// offstage is only for STAGE_SCENE; no `{.map}` block can ask for it.
	layout: {
		name:
			| "umap"
			| "timeline"
			| "sky"
			| "offstage"
			| "effectiveProgressions"
			| "effectiveProgressionsByDecade"
			| "progressionOverTime";
	};
	// What a chart layout features: its progression's songs, and the years
	// it highlights. Set by the slide's stage (see withStageMap).
	chart: { progression: string | null; highlight: YearSpan | null };
	// Where framed layouts sit: below the story text, or the whole screen.
	frame: "text" | "full";
	camera:
		| { kind: "home"; centered: boolean }
		// Unscripted: the view stays wherever it is.
		| { kind: "stay" }
		| { kind: "cluster"; name: string }
		| { kind: "song"; songKey: string };
	songs: {
		// null = every song; else everyone else fades out.
		only: readonly string[] | null;
		// Enlarged, labeled and inert.
		highlighted: readonly string[];
		// Enlarged, labeled, 🎧, clickable to play.
		playable: readonly string[];
		// Everything not highlighted is drawn faint.
		dimmed: boolean;
		// Spotlights the sky's named songs in turn (SKY_CYCLE_SONGS).
		cycle: boolean;
	};
	// Video ids.
	media: { followVideo: string | null; litVideoSongs: string | null };
	labels: {
		hidden: boolean;
		// Only label these clusters, by name; null = any, as space allows.
		only: readonly string[] | null;
		rotate: boolean;
	};
	interaction: {
		movable: boolean;
		hoverable: boolean;
		// "basic" is title, year, artist and the bar of progressions;
		// "label" just the title, year and artist.
		tooltip: "full" | "basic" | "label";
	};
	player: { hidden: boolean };
	// Arriving from another layout, these songs move first (together), then
	// these clusters' songs, one cluster at a time in order, then everyone
	// else.
	reveal: { songs: readonly string[]; clusters: readonly string[] };
};

// What a block with no keys but `visible` parses to.
const NO_CHART: MapScene["chart"] = { progression: null, highlight: null };

export const DEFAULT_MAP_SCENE: MapScene = {
	layout: { name: "umap" },
	chart: NO_CHART,
	frame: "text",
	camera: { kind: "home", centered: false },
	songs: {
		only: null,
		highlighted: [],
		playable: [],
		dimmed: false,
		cycle: false
	},
	media: { followVideo: null, litVideoSongs: null },
	labels: { hidden: false, only: null, rotate: false },
	interaction: { movable: true, hoverable: true, tooltip: "full" },
	player: { hidden: false },
	reveal: { songs: [], clusters: [] }
};

// Behind a slide with no `{.map}` block: the map is hidden, and every song
// waits off stage until a slide that shows the map brings it back.
export const STAGE_SCENE: MapScene = {
	layout: { name: "offstage" },
	chart: NO_CHART,
	frame: "text",
	camera: { kind: "stay" },
	songs: {
		only: null,
		highlighted: [],
		playable: [],
		dimmed: false,
		cycle: false
	},
	media: { followVideo: null, litVideoSongs: null },
	labels: { hidden: true, only: null, rotate: false },
	interaction: { movable: false, hoverable: false, tooltip: "full" },
	player: { hidden: true },
	reveal: { songs: [], clusters: [] }
};

const KNOWN_KEYS = new Set<string>([
	"visible",
	"layout",
	"frame",
	"focusCluster",
	"focusSong",
	"centered",
	"onlySongs",
	"highlightSongs",
	"playableSongs",
	"dimmed",
	"cycleSongs",
	"followVideo",
	"litVideoSongs",
	"hideLabels",
	"showLabels",
	"rotateLabels",
	"movable",
	"hoverable",
	"tooltip",
	"hidePlayer",
	"revealSongs",
	"revealClusters"
] satisfies (keyof CopyMap)[]);

const LAYOUT_NAMES = [
	"umap",
	"timeline",
	"sky",
	"effectiveProgressions",
	"effectiveProgressionsByDecade",
	"progressionOverTime"
] as const;
const FRAME_NAMES = ["text", "full"] as const;
const TOOLTIP_NAMES = ["full", "basic", "label"] as const;

const parseBoolean = (value: unknown): boolean | undefined =>
	value === undefined ? undefined : String(value).trim() === "true";

const parseText = (value: unknown): string | undefined => {
	if (value === undefined || value === null) return undefined;
	return String(value).trim() || undefined;
};

// A list in the copy, or one comma-separated string. Absent or empty: null.
const parseList = (value: unknown): string[] | null => {
	if (!value) return null;
	const items = [value as string | string[]]
		.flat()
		.flatMap((item) => String(item).split(","))
		.map((item) => item.trim())
		.filter(Boolean);
	return items.length > 0 ? items : null;
};

export const warn = (message: string) => {
	if (import.meta.env.DEV) console.warn(`[map] ${message}`);
};

// Null when the slide shows no map. Unknown keys and values warn in dev.
export const parseMapScene = (
	copyMap: CopyMap | null | undefined
): MapScene | null => {
	if (!copyMap || parseBoolean(copyMap.visible) !== true) return null;
	for (const key of Object.keys(copyMap)) {
		if (!KNOWN_KEYS.has(key)) warn(`unknown key "${key}" (ignored)`);
	}

	const layoutName = parseText(copyMap.layout) ?? "umap";
	const knownLayout = LAYOUT_NAMES.find((name) => name === layoutName);
	if (!knownLayout) warn(`unknown layout "${layoutName}" (using umap)`);
	const layout: MapScene["layout"] = { name: knownLayout ?? "umap" };

	// The sky fills the screen unless told otherwise.
	const frameName =
		parseText(copyMap.frame) ?? (layout.name === "sky" ? "full" : "text");
	const frame = FRAME_NAMES.find((name) => name === frameName) ?? "text";
	if (frame !== frameName) warn(`unknown frame "${frameName}" (using text)`);

	const tooltipName = parseText(copyMap.tooltip) ?? "full";
	const tooltip = TOOLTIP_NAMES.find((name) => name === tooltipName) ?? "full";
	if (tooltip !== tooltipName) {
		warn(`unknown tooltip "${tooltipName}" (using full)`);
	}

	const focusCluster = parseText(copyMap.focusCluster);
	const focusSong = parseText(copyMap.focusSong);
	if (focusCluster !== undefined && focusSong !== undefined) {
		warn("focusCluster and focusSong are both set (using focusCluster)");
	}
	const camera: MapScene["camera"] =
		focusCluster !== undefined
			? { kind: "cluster", name: focusCluster }
			: focusSong !== undefined
				? { kind: "song", songKey: focusSong }
				: { kind: "home", centered: parseBoolean(copyMap.centered) ?? false };

	return {
		layout,
		chart: NO_CHART,
		frame,
		camera,
		songs: {
			only: parseList(copyMap.onlySongs),
			highlighted: parseList(copyMap.highlightSongs) ?? [],
			playable: parseList(copyMap.playableSongs) ?? [],
			dimmed: parseBoolean(copyMap.dimmed) ?? false,
			cycle: parseBoolean(copyMap.cycleSongs) ?? false
		},
		media: {
			followVideo: parseText(copyMap.followVideo) ?? null,
			litVideoSongs: parseText(copyMap.litVideoSongs) ?? null
		},
		labels: {
			hidden: parseBoolean(copyMap.hideLabels) ?? false,
			only: parseList(copyMap.showLabels),
			rotate: parseBoolean(copyMap.rotateLabels) ?? false
		},
		interaction: {
			movable: parseBoolean(copyMap.movable) ?? true,
			hoverable: parseBoolean(copyMap.hoverable) ?? true,
			tooltip
		},
		player: { hidden: parseBoolean(copyMap.hidePlayer) ?? false },
		reveal: {
			songs: parseList(copyMap.revealSongs) ?? [],
			clusters: parseList(copyMap.revealClusters) ?? []
		}
	};
};

// What the slide's stage component asks of the map (see stageMap.svelte.ts):
// the chart it features, and its own songs, playable on the map.
export type StageMapRequest = {
	chart: MapScene["chart"] | null;
	songKeys: readonly string[];
};

export const withStageMap = (
	scene: MapScene,
	{ chart, songKeys }: StageMapRequest
): MapScene => {
	if (chart === null && songKeys.length === 0) return scene;
	return {
		...scene,
		chart: chart ?? scene.chart,
		songs: {
			...scene.songs,
			playable: [...new Set([...scene.songs.playable, ...songKeys])]
		}
	};
};

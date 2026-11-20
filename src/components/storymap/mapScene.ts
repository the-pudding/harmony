// What a slide wants the map to be, as one typed object. Writers keep
// editing flat keys in the Google Doc's `{.map}` block (friendlier in
// ArchieML); parseMapScene turns them into a MapScene, where string →
// boolean, comma lists, trimming and defaults happen. Index passes the scene
// to HexMap instead of loose props. The scene is static per slide; what the
// reader is doing (exploring, playing, hovering) is passed alongside it.
import type { CopyMap } from "$data/copy.json";

export type MapScene = {
	layout: { name: "umap" } | { name: "timeline" };
	// Where framed layouts (the timeline) sit: "text" is below the story
	// text (and any video under it); "full" is the whole screen, stretching
	// under the text. UMAP ignores it.
	frame: "text" | "full";
	camera: // The whole map (a bit low to leave room for text, unless centered).
		| { kind: "home"; centered: boolean }
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
	};
	// Video ids: the map follows what's playing, or starts with a video's
	// songs already lit.
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
		// What a hovered song's tooltip shows: "basic" is title, year and
		// artist only, for the intro, before the rest has been introduced.
		tooltip: "full" | "basic";
	};
	player: { hidden: boolean };
};

// A map with nothing asked of it: what a block with no keys but `visible`
// parses to, and what the map shows on slides without a block (it stays
// mounted, just hidden).
export const DEFAULT_MAP_SCENE: MapScene = {
	layout: { name: "umap" },
	frame: "text",
	camera: { kind: "home", centered: false },
	songs: { only: null, highlighted: [], playable: [], dimmed: false },
	media: { followVideo: null, litVideoSongs: null },
	labels: { hidden: false, only: null, rotate: false },
	interaction: { movable: true, hoverable: true, tooltip: "full" },
	player: { hidden: false }
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
	"followVideo",
	"litVideoSongs",
	"hideLabels",
	"showLabels",
	"rotateLabels",
	"movable",
	"hoverable",
	"tooltip",
	"hidePlayer"
] satisfies (keyof CopyMap)[]);

const LAYOUT_NAMES = ["umap", "timeline"] as const;
const FRAME_NAMES = ["text", "full"] as const;
const TOOLTIP_NAMES = ["full", "basic"] as const;

// undefined stays undefined (not set), so defaults can apply.
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

const warn = (message: string) => {
	if (import.meta.env.DEV) console.warn(`[map] ${message}`);
};

// The scene for a slide's `map` block, or null when the slide shows no map
// (no block, or visible isn't "true"). Unknown keys and layouts are a
// console.warn in dev, so a typo in the doc is noticed.
export const parseMapScene = (
	copyMap: CopyMap | null | undefined
): MapScene | null => {
	if (!copyMap || parseBoolean(copyMap.visible) !== true) return null;
	for (const key of Object.keys(copyMap)) {
		if (!KNOWN_KEYS.has(key)) warn(`unknown key "${key}" (ignored)`);
	}

	const layoutName = parseText(copyMap.layout) ?? "umap";
	const knownLayout = (LAYOUT_NAMES as readonly string[]).includes(layoutName);
	if (!knownLayout) warn(`unknown layout "${layoutName}" (using umap)`);
	const layout: MapScene["layout"] =
		layoutName === "timeline" ? { name: "timeline" } : { name: "umap" };

	const frameName = parseText(copyMap.frame) ?? "text";
	const frame = FRAME_NAMES.find((name) => name === frameName) ?? "text";
	if (frame !== frameName) warn(`unknown frame "${frameName}" (using text)`);

	const tooltipName = parseText(copyMap.tooltip) ?? "full";
	const tooltip = TOOLTIP_NAMES.find((name) => name === tooltipName) ?? "full";
	if (tooltip !== tooltipName) {
		warn(`unknown tooltip "${tooltipName}" (using full)`);
	}

	// A focused cluster wins over a focused song (as in the scatter).
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
		frame,
		camera,
		songs: {
			only: parseList(copyMap.onlySongs),
			highlighted: parseList(copyMap.highlightSongs) ?? [],
			playable: parseList(copyMap.playableSongs) ?? [],
			dimmed: parseBoolean(copyMap.dimmed) ?? false
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
		player: { hidden: parseBoolean(copyMap.hidePlayer) ?? false }
	};
};

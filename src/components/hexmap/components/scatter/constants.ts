import type { EmbeddingMethod } from "../../embedding/reducers/types.js";
import { UMAP_DRIVEN_METHODS } from "../../embedding/reducers/types.js";
import { SONG_LABEL_LINE_HEIGHT_PX } from "../songLabelText.js";

// ── Layout & zoom ─────────────────────────────────────────────────────
// Space between the canvas edge and the plotted area, in pixels.
export const PLOT_MARGIN = 32;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 40;
// How far past the plot's edges the view can pan, in screen pixels.
export const PAN_EDGE_PADDING = 200;
// Tiny per-song offset (in normalized units) so stacked songs separate.
export const JITTER_AMPLITUDE = 0.004;
// Hex mode: hex radius on screen at zoom 1, the zoom where hexes give way
// to dots, and how gently hexes shrink on screen as you zoom in (they go
// from 7px at 1× to about 5px just before dots take over).
export const HEX_ZOOM = {
	baseScreenRadius: 7,
	dotsAtZoom: 4,
	shrinkExponent: 0.25
} as const;

// ── Focus & camera moves ──────────────────────────────────────────────
// Zoom used when focusing a single song.
export const DEFAULT_FOCUS_SCALE = 8;
export const FOCUS_TRANSITION_MS = 900;
// Scripted focus changes (focusClusterName / focusSongKey) move slower,
// since they happen without the user asking to move the map.
export const SCRIPTED_FOCUS_TRANSITION_MS = 2000;
// How much of the screen a focused cluster fills. Its bounding box is
// scaled to fit within this fraction of both the viewport's width and
// height, leaving breathing room around the edge.
export const CLUSTER_FOCUS_PADDING = 0.65;
export const MAX_CLUSTER_FOCUS_SCALE = 24;
// Same idea, for hex mode with a focusFrame: the cluster fits within this
// fraction of the frame's height (and the viewport's width), but zooms at
// least to HEX_FOCUS_SCALE so its songs show as dots.
export const FRAME_FOCUS_FILL = 0.85;
// Hex mode without a focusFrame ignores fit and zooms just past the zoom
// where hexes turn into dots, so the cluster's songs show as dots.
export const HEX_FOCUS_SCALE = HEX_ZOOM.dotsAtZoom * 1.01;
// Flying to an off-screen song zooms out a bit on the way there.
// Zooming to zoomSongKey goes this far past HEX_FOCUS_SCALE in hex mode.
export const ZOOM_SONG_HEX_FACTOR = 2;
export const FLY_TO_ZOOM_OUT_FACTOR = 0.75;
export const FLY_TO_TRANSITION_MS = 1300;
// Clicking a hex zooms in, around the click, to HEX_FOCUS_SCALE.
export const HEX_CLICK_ZOOM_MS = 450;
// Points animating between layouts.
export const TWEEN_DURATION_MS = 700;

// ── Points ────────────────────────────────────────────────────────────
export const POINT_RADIUS = 3;
export const SELECTED_POINT_RADIUS = 6;
export const HOVER_PICK_RADIUS = 12;
export const RING_WIDTH = 1.5;
// Used when colorMode is "off" — a plain, star-like white so a
// highlighted song/family reads clearly against an otherwise uncolored
// field.
export const STAR_FILL_COLOR = "#e4e4e7";

// ── Outlined (called-out) songs & their labels ────────────────────────
export const OUTLINE_COLOR = "#ffffff";
export const OUTLINED_POINT_RADIUS = 10;
export const OUTLINE_WIDTH = 3;
export const OUTLINE_GLOW_BLUR = 10;
// The spotlit song (playingSongKey, else zoomSongKey) gets a bigger
// marker with a wider glow, and every other song (and outlined songs'
// labels) fades back to this alpha.
export const PLAYING_POINT_RADIUS = 14;
export const PLAYING_GLOW_BLUR = 28;
export const NOT_PLAYING_ALPHA = 0.3;
// How long the playing marker takes to grow (and the last one to shrink).
export const PLAYING_TWEEN_MS = 400;
// Space between a marker's edge and its label.
export const OUTLINED_LABEL_GAP = 6;
export const OUTLINED_LABEL_LINE_HEIGHT = SONG_LABEL_LINE_HEIGHT_PX;
// Empty space kept around each label so it doesn't touch its neighbors.
export const OUTLINED_LABEL_PADDING = 3;

// ── Axes ──────────────────────────────────────────────────────────────
export const AXIS_LABEL_COLOR = "rgba(161, 161, 170, 0.7)";
export const AXIS_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';

// ── Cluster outlines (dot mode) ───────────────────────────────────────
// Density clustering is only meaningful over layouts UMAP actually produced
// (see UMAP_DRIVEN_METHODS) — PCA/feature-axis positions are linear
// projections or hand-designed axes where geometric proximity doesn't mean
// "similar songs", so DBSCAN circles there would be visually plausible but
// semantically noise.
export const CLUSTERABLE_METHODS = new Set<EmbeddingMethod>(
	UMAP_DRIVEN_METHODS
);
export const CLUSTER_RADIUS_PADDING = 8;
export const CLUSTER_STROKE_COLOR = "#e4e4e7";
export const CLUSTER_STROKE_WIDTH = 2;
export const CLUSTER_UNNAMED_STROKE_ALPHA = 0.72;
export const CLUSTER_DASH_PATTERN = [7, 5];
// A cluster "heavily involves" a highlighted family when at least this
// fraction of its songs are in familyEmphasisSongKeys; below that its
// outline fades to CLUSTER_DEEMPHASIZED_STROKE_ALPHA and its name hides.
export const FAMILY_INVOLVEMENT_THRESHOLD = 0.5;
export const CLUSTER_DEEMPHASIZED_STROKE_ALPHA = 0.15;
export const CLUSTER_LABEL_COLOR = "rgba(244, 244, 245, 0.9)";
export const CLUSTER_LABEL_FONT =
	'10px "JetBrains Mono", ui-monospace, monospace';
export const CLUSTER_NAME_FONT =
	'600 11px "JetBrains Mono", ui-monospace, monospace';
export const CLUSTER_NAME_COLOR = "#f4f4f5";
// Space between a cluster's outline and its label.
export const CLUSTER_LABEL_GAP = 6;

// ── Hex mode: colors ──────────────────────────────────────────────────
// Dark-surface categorical steps (dataviz reference palette). Color only
// keeps neighboring regions apart; labels and tooltips name them.
export const REGION_PALETTE = [
	"#3987e5",
	"#d95926",
	"#199e70",
	"#c98500",
	"#d55181",
	"#008300",
	"#9085e9",
	"#e66767"
] as const;
// Clusters whose color is fixed rather than auto-assigned, by name.
export const PINNED_REGION_COLORS = new Map([["axis of awesome", "#9085e9"]]);
// Pairs that failed or warned the palette validator (colorblind or
// normal-vision separation) on this page's #09090b surface. Neighboring
// regions never get one of these pairs.
export const CONFUSABLE_REGION_PAIRS = new Set(
	[
		["#3987e5", "#9085e9"],
		["#d95926", "#c98500"],
		["#d95926", "#d55181"],
		["#d95926", "#008300"],
		["#d95926", "#e66767"],
		["#199e70", "#d55181"],
		["#199e70", "#008300"],
		["#199e70", "#e66767"],
		["#c98500", "#008300"],
		["#c98500", "#e66767"],
		["#d55181", "#e66767"]
	].map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`))
);
// Per theme: what a hex fades toward when it's only partly its main
// progression (faded), the fill for songs or hexes with no matched
// progression (unmatched), hexes and songs outside a clearly defined
// cluster (ambiguous), and region label text with its halo.
export const HEX_THEME_COLORS = {
	dark: {
		faded: "#2a2a2e",
		unmatched: "#27272a",
		ambiguous: "#3f3f46",
		labelText: "#f4f4f5",
		labelHalo: "#09090b"
	},
	light: {
		faded: "#ececee",
		unmatched: "#f4f4f5",
		ambiguous: "#e4e4e7",
		labelText: "#18181b",
		labelHalo: "#ffffff"
	}
} as const;
// Faintest a hex can get, so even a mixed hex keeps a hint of its hue.
export const MIN_REGION_TINT = 0.2;
// How much hexes fade by progression share when fully zoomed out (0 = solid
// cluster color, 1 = full fade); it grows to 1 by HEX_ZOOM.dotsAtZoom.
export const HEX_MIN_SHARE_FADE = 0.3;
// A hex takes a cluster's color only when that cluster holds at least
// this share of its songs; otherwise it's unclustered or split, and gray.
export const MIN_CLUSTER_SHARE_OF_HEX = 0.5;
// Hexes are drawn slightly oversized so neighbors overlap and touch with
// no seams or gaps between them.
export const HEX_OVERLAP_PX = 0.5;
// Border drawn around the hovered hex region.
export const HOVERED_CLUSTER_STROKE_COLOR = "#ffffff";
export const HOVERED_CLUSTER_STROKE_WIDTH = 2;

// ── Hex mode: region labels ───────────────────────────────────────────
export const HEX_LABEL_FONT =
	"500 10px 'JetBrains Mono', ui-monospace, monospace";
// Any colored region this many hexes or larger can be labeled.
export const HEX_LABEL_MIN_HEXES = 1;
// Empty space kept around each label so neighboring labels don't touch.
export const HEX_LABEL_PADDING_X = 6;
export const HEX_LABEL_PADDING_Y = 6;
// Extra space around labels when fully zoomed out, where they'd otherwise
// crowd; it eases away by HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM.
export const HEX_LABEL_EXTRA_PADDING_ZOOMED_OUT = 4;
export const HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM = 2;
// Nearby clusters often share a progression; skip a label when the same
// name is already shown within this distance.
export const HEX_LABEL_REPEAT_DISTANCE_PX = 150;
// Rotating labels: ROTATING_LABEL_COUNT slots, each showing a label for
// about ROTATING_LABEL_HOLD_MS (± jitter), fading it out and, after a
// short gap, fading in a different one. Slots start together but swap at
// staggered times, so 4–5 labels are always up and they change one by one.
export const ROTATING_LABEL_COUNT = 5;
export const ROTATING_LABEL_HOLD_MS = 6000;
export const ROTATING_LABEL_HOLD_JITTER_MS = 1500;
export const ROTATING_LABEL_GAP_MS = 400;
export const ROTATING_LABEL_START_STAGGER_MS = 250;
export const ROTATING_LABEL_FADE_MS = 800;

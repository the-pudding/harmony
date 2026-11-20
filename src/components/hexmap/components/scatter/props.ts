import type { ZoomTransform } from "d3";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { DensityCluster } from "../../embedding/clustering/densityClusters.js";
import type { EmbeddingMethod } from "../../embedding/reducers/types.js";
import type { ScatterAxisLabels } from "../scatterPoint.js";
import type { LayoutResult } from "../../../storymap/layouts/types.js";
import type { SongTable } from "../../../storymap/songTable.js";
import type { RevealStages } from "../../../storymap/revealStages.js";
import type { MapFrame } from "./types.js";
import type {
	ClusterRegion,
	ProgressionShare
} from "../../embedding/layout/hexBins.js";

export type EmbeddingScatterProps = {
	// Layout positions are 0–1 across the plot, indexed like songs.
	songs: SongTable;
	layout: LayoutResult;
	songByKey: Map<string, GroupedSong>;
	// For songs missing from songByKey: loadSong fetches one on hover for
	// its tooltip, and songSummaryByKey names it while that loads.
	loadSong?: ((songKey: string) => Promise<GroupedSong | null>) | null;
	songSummaryByKey?: ReadonlyMap<
		string,
		{ title: string; artists: readonly string[]; year?: number }
	> | null;
	selectedSongKey: string | null;
	coClusterSongKeys: Set<string>;
	// Only these songs are drawn and hoverable; null shows all.
	visibleSongKeys?: ReadonlySet<string> | null;
	// Drawn songs not in this set are dimmed to DIMMED_SONG_ALPHA.
	dimExceptSongKeys?: ReadonlySet<string> | null;
	// Per-song stagger (0–1, see STAGGER_SPAN) for a reveal; overrides the layout's own.
	revealStagger?: Float32Array | null;
	// The song a reveal ripples from; spotlit without fading the rest.
	revealOriginSongKey?: string | null;
	// Arriving at this layout from another, songs move in these stages.
	revealStages?: RevealStages | null;
	// Called with true when a staged arrival starts, and false once its songs
	// have settled and its hexes faded in (or it's interrupted).
	onStagedRevealChange?: ((running: boolean) => void) | null;
	inYearSongKeys?: Set<string> | null;
	axisLabels?: ScatterAxisLabels | null;
	method: EmbeddingMethod;
	clusters: DensityCluster[];
	emphasizedClusterHashes: Set<string> | null;
	onSelect: (songKey: string | null) => void;
	// Optional scripted zoom target (used by /story). Omitted entirely for
	// normal interactive use — undefined means this feature is unused, so
	// user-driven pan/zoom is never overridden. Pass a songKey to animate
	// the view centered on it, or null to animate back out to the full view.
	focusSongKey?: string | null;
	focusScale?: number;
	// Optional scripted zoom onto a whole named cluster (by its resolved
	// display name, e.g. "axis") rather than one song — fits the cluster's
	// current member bounds to the viewport. Same undefined/null contract
	// as focusSongKey; takes priority over it when both are set.
	focusClusterName?: string | null;
	// Scripted focus changes (focusClusterName, focusSongKey) jump straight
	// to the new view instead of animating.
	instantCamera?: boolean;
	// Layout and visibility changes jump instead of animating.
	instantLayout?: boolean;
	// A cluster the user picked (by name, like focusClusterName): the view
	// animates to fit it when it's set, and again when focusFrame changes,
	// but stays put when it's cleared, and the map stays movable.
	selectedClusterName?: string | null;
	// A song the user picked (e.g. from a search): the view animates to
	// center it (in focusFrame) and zoom in when it's set, and again when
	// focusFrame changes, but stays put when it's cleared, and the map
	// stays movable. Unless another song is playing, it's spotlit like
	// playingSongKey, even if it isn't outlined.
	zoomSongKey?: string | null;
	// The song whose details the page has open: spotlit like
	// playingSongKey (which wins), but the view doesn't move.
	openSongId?: string | null;
	// A song to spotlight (when nothing above is) without moving the view
	// or changing what clicks do, e.g. one picked in search.
	spotlitSongKey?: string | null;
	// Whether the spotlit song fades the others back, or only grows its own marker.
	spotlightFadesOthers?: boolean;
	// The part of the canvas a focused cluster should fill, in screen
	// pixels from its top (e.g. the space below text over the map). In
	// hex mode the cluster is scaled to almost fill its height and
	// centered in it; otherwise the cluster focuses as usual.
	focusFrame?: { top: number; height: number } | null;
	// Shifts the resting view and focus targets down by this many screen
	// pixels, e.g. to leave room for text over the top of the map.
	// Unframed layouts only; framed ones use mapFrame.
	offsetY?: number;
	// Rect framed layouts (layout.framed) fill; unframed layouts ignore it.
	mapFrame?: MapFrame;
	// Optional blanket emphasis set (used by /story to highlight a whole
	// progression family rather than one song's cluster). When set,
	// everything NOT in it dims — independent of selectedSongKey /
	// coClusterSongKeys, so it works with no specific song selected at
	// all. Omit (or null) for no effect.
	emphasizedSongKeys?: Set<string> | null;
	// Draw the dashed cluster outlines + names. Defaults to true (existing
	// behavior); /story defaults this off per beat.
	showClusterOutlines?: boolean;
	// Name each outlined cluster above its outline. Defaults to true.
	showClusterNames?: boolean;
	// Optional song set used to judge, per cluster, whether it "heavily
	// involves" a highlighted family (used by /story alongside
	// highlightFamily + showClusterOutlines) — a cluster whose members
	// are mostly NOT in this set draws a faint outline with its name
	// hidden, rather than the normal full treatment. Distinct from
	// emphasizedSongKeys (which fades dots) so a plain song highlight
	// with outlines on doesn't also mute every other cluster's outline.
	// Omit (or null) for normal treatment of every cluster.
	familyEmphasisSongKeys?: Set<string> | null;
	// Overrides the fill of songs in emphasizedSongKeys; null keeps their normal color.
	emphasisFillColor?: string | null;
	// Fill color for songs in accentSongKeys. Unlike emphasizedSongKeys it
	// dims nothing, so the rest of the map keeps its structure. Accented
	// dots are drawn last so they sit on top of the dots around them.
	// emphasisFillColor wins when a song is in both sets.
	accentSongKeys?: Set<string> | null;
	accentFillColor?: string | null;
	// Songs drawn as larger, white-ringed, glowing dots on top of
	// everything else, with their titles and artists beside them. In hex
	// mode, only once zoomed in to dots.
	outlinedSongKeys?: Set<string> | null;
	// Put before outlinedSongKeys songs' titles in their labels (e.g. an
	// emoji marking them playable), so they stand apart from a spotlit
	// song that isn't outlined.
	outlinedTitlePrefix?: string | null;
	// Of outlinedSongKeys, ones drawn the same but not playable: no
	// outlinedTitlePrefix, and clicks treat them as plain dots.
	inertOutlinedSongKeys?: Set<string> | null;
	// Of inertOutlinedSongKeys, ones drawn as small markers with no label.
	smallOutlinedSongKeys?: Set<string> | null;
	// One of outlinedSongKeys to call out above the rest (e.g. the song
	// playing): drawn bigger and on top, with the others faded.
	playingSongKey?: string | null;
	// 0 to 1 through the playing song's clip; draws a ring and pause icon.
	playingClipProgressFraction?: number;
	playingChordColorSegments?: {
		startFraction: number;
		endFraction: number;
		chordColor: string;
	}[];
	// How hex bins are painted (layout.aggregate hex; needs progressionSharesBySongKey).
	hexStyle?: "hex" | "watercolor" | "hex-watercolor";
	// Each song's progressions with their share of its matched chords.
	progressionSharesBySongKey?: ReadonlyMap<
		string,
		readonly ProgressionShare[]
	> | null;
	// The cluster each song belongs to, for clusters with a clear main
	// progression. Hex mode colors by cluster: songs missing from this
	// map, and hexes no single cluster holds half of, are drawn gray.
	clusterRegionBySongKey?: ReadonlyMap<string, ClusterRegion> | null;
	// Outline labels by cluster hash. When omitted, clusters are unnamed.
	clusterNames?: ReadonlyMap<string, string> | null;
	// User interaction, both on by default. movable = drag, wheel, pinch
	// and double-click zoom, and click-to-zoom on hexes; hoverable = hover
	// tooltips and outlines, and click to select a song. Scripted focus
	// (focusSongKey / focusClusterName) still works with them off.
	movable?: boolean;
	hoverable?: boolean;
	// Off: clicks on the map do nothing (no picking, playing, opening chords
	// or song links), and the cursor never turns into a pointer. Hover still
	// works. On by default.
	clickable?: boolean;
	// Only these songs can be hovered (and clicked) at dot zoom; the rest are
	// drawn but ignore the pointer. Null (the default) for every song.
	hoverableSongKeys?: ReadonlySet<string> | null;
	// Hex-mode region labels drawn all at once on the map.
	showLabels?: boolean;
	// Hex-mode region labels that fade in one at a time at random spots,
	// a few seconds apart. Use with showLabels off.
	showRotatingLabels?: boolean;
	// Only label regions with these names (case-insensitive), for either
	// kind of label. Omit (or null) to label any region that fits.
	labelNames?: readonly string[] | null;
	// Hex-mode colors for the surface the map sits on. "light" uses
	// lighter grays and dark label text; the canvas itself is always
	// transparent, so the page provides the background.
	theme?: "dark" | "light";
	// Called with the pan/zoom transform whenever it changes (user or
	// scripted), e.g. to show where the view is on an overview map.
	onTransformChange?: ((transform: ZoomTransform) => void) | null;
	// Called on every click on the map with the outlinedSongKeys song
	// under the pointer, or null when the click missed them all.
	onOutlinedSongClick?: ((songKey: string | null) => void) | null;
	// Hex mode: called when a cluster is picked, with its name and the song
	// clicked, if any: on a hex click (after onOutlinedSongClick), a dot's
	// click (its cluster, or null if it has none), or a click on a cluster's
	// title at dot zoom (with no song). Null for a gray hex or empty space.
	onClusterClick?:
		| ((clusterName: string | null, songKey: string | null) => void)
		| null;
	// Called whenever the user drags, wheels or pinches the view (not on
	// scripted or click-to-zoom moves).
	onUserMove?: (() => void) | null;
	// Canvas pixels per CSS pixel. Defaults to the screen's; lower it when
	// the map is shown scaled down (e.g. an inset) to save memory.
	pixelRatio?: number | null;
	// Hex mode: a simpler song tooltip (see HexSongTooltip).
	simpleSongTooltip?: boolean;
	// "basic" shows only title, year and artist.
	tooltipDetail?: "full" | "basic";
	// Hex mode: whether a region, by name, has playable songs; its tooltip
	// then shows outlinedTitlePrefix before the name.
	hexHasPlayableSongs?: ((regionName: string) => boolean) | null;
	// Hex mode, at dot zoom: called to open or close a song's full chords
	// when a song that isn't outlined is clicked (right after its cluster
	// goes to onClusterClick), or when an outlined song's label is clicked.
	onSongChordsToggle?: ((songId: string) => void) | null;
	// Called with each progression's map color whenever they change.
	onProgressionColors?: ((colors: ReadonlyMap<string, string>) => void) | null;
	// Called with each song's dot color at full zoom whenever they change.
	onSongColors?: ((colorOf: (songKey: string) => string) => void) | null;
	// A song hovered somewhere else (e.g. a chart beside the map), shown
	// here as if the pointer were on it: ringed, with its tooltip.
	linkedSongKey?: string | null;
	// Called with the song under the pointer (or null) whenever it
	// changes; a linkedSongKey hover isn't reported back.
	onSongHover?: ((songKey: string | null) => void) | null;
	// In hex mode at dot zoom, the cluster (by name) whose title is drawn
	// elsewhere, full size, e.g. by its player; its title is left out here
	// and room is kept for it.
	mergedTitleClusterName?: string | null;
	// Called with where that title goes (its top center, in viewport
	// pixels), or null when the cluster isn't titled on screen.
	onMergedTitleAnchor?:
		| ((anchor: { x: number; y: number } | null) => void)
		| null;
	// A canvas over the page, viewport-sized and click-through, where marks
	// of songs anchored by a slide (see songDots) are drawn, pinned to
	// their anchors. Without one, anchors are ignored.
	pinCanvas?: HTMLCanvasElement | null;
};

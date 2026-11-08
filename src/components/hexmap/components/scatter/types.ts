import type { ZoomTransform } from "d3";
import type { DensityCluster } from "../../embedding/clustering/densityClusters.js";
import type { ClusterEllipse2D } from "../../embedding/clustering/clusterBounds.js";
import type { ScatterPoint } from "../scatterPoint.js";
import type { HEX_THEME_COLORS } from "./constants.js";

// A song's position across the plot, 0–1 on each axis (y up).
export type Position = { nx: number; ny: number };

// A pixel position: base (unzoomed) or screen, depending on context.
export type Point2D = { x: number; y: number };

export type NormalizedPoint = ScatterPoint & Position;

export type Box = { left: number; right: number; top: number; bottom: number };

// The canvas size and how far the resting view is shifted down.
export type ViewSize = { width: number; height: number; offsetY: number };

// Everything needed to turn a Position into a screen pixel.
export type Viewport = ViewSize & { transform: ZoomTransform };

// The part of the canvas a focused cluster or song should fill, in screen
// pixels from its top.
export type FocusFrame = { top: number; height: number };

// A label placed like song positions (0–1 across the plot).
export type LabelSpot = Position & { text: string };

export type ClusterHit = {
	cluster: DensityCluster;
	geometry: ClusterEllipse2D;
};

export type HexThemeColors =
	(typeof HEX_THEME_COLORS)[keyof typeof HEX_THEME_COLORS];

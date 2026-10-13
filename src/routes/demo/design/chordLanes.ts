import { easeCubicInOut, interpolateRgb } from "d3";
import {
	appearanceFor,
	type ChordAppearance
} from "./chord-viz/chordAppearanceLookup.js";
import type { ChordPalette } from "./chord-viz/chordPalettes.js";
import { morphedShapePath } from "./chord-viz/chordShapes.js";
import type { KeyTonality } from "./chord-viz/diatonicChords.js";
import { simplifyRomanToken } from "./chord-viz/topProgressions.js";
import { BLOB_RADIUS } from "./chord-viz/watercolor.js";
import { isActiveAt, type ChordTimeline } from "./chordTimeline.js";

type FractionSpan = { startFraction: number; endFraction: number };
type KeyedSpan = FractionSpan & { key: string };

export type LaneChord = FractionSpan & {
	key: string;
	roman: string;
	progressionKey: string;
	sectionKey: string;
	appearance: ChordAppearance;
};

export type LaneSize = { widthPx: number; heightPx: number; paddingPx: number };

export type LaneSpacing = {
	clusterKeyOf: (chord: LaneChord) => string;
	overlapFraction: number;
	clusterGapPx: number;
};

export type LaneBlob = { centerX: number; scaleX: number; scaleY: number };

export type ChordGlide = { fromIndex: number; toIndex: number; t: number };

export type Glider = LaneBlob & {
	path: string;
	fill: string;
	labelIndex: number;
};

export const SHAPE_DIAMETER = 2 * BLOB_RADIUS;
const MAX_ASPECT_RATIO = 1.5;
const MIN_BLOB_WIDTH_PX = 4;
const HALF = 0.5;

export const GLIDE_START_FRACTION = 0.6;
const GLIDER_SCALE = 1.3;
const GLIDER_STRETCH = 0.35;
const GLIDER_COLOR_LEAD = 1.6;

const midpointOf = (span: FractionSpan): number =>
	(span.startFraction + span.endFraction) / 2;

const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1);

const lerp = (from: number, to: number, t: number): number =>
	from + (to - from) * t;

const keyOfSpanContaining = (
	spans: KeyedSpan[],
	fraction: number,
	fallbackKey: string
): string =>
	spans.find((span) => isActiveAt(span, fraction))?.key ?? fallbackKey;

export const laneChordsOf = (
	timeline: ChordTimeline,
	tonality: KeyTonality,
	palette?: ChordPalette
): LaneChord[] =>
	timeline.chords.map((chord) => ({
		key: chord.key,
		roman: chord.roman,
		startFraction: chord.startFraction,
		endFraction: chord.endFraction,
		progressionKey: keyOfSpanContaining(
			timeline.groups,
			midpointOf(chord),
			chord.key
		),
		sectionKey: keyOfSpanContaining(
			timeline.sections,
			midpointOf(chord),
			chord.key
		),
		appearance: appearanceFor(
			tonality,
			simplifyRomanToken(chord.roman),
			palette
		)
	}));

export const byProgression = (chord: LaneChord): string => chord.progressionKey;
export const bySection = (chord: LaneChord): string => chord.sectionKey;

const sharesCluster = (
	chords: LaneChord[],
	spacing: LaneSpacing,
	leftIndex: number,
	rightIndex: number
): boolean => {
	const left = chords[leftIndex];
	const right = chords[rightIndex];
	return (
		left !== undefined &&
		right !== undefined &&
		spacing.clusterKeyOf(left) === spacing.clusterKeyOf(right)
	);
};

const edgeExtensionPx = (
	joinsNeighbor: boolean,
	chordWidthPx: number,
	spacing: LaneSpacing
): number =>
	joinsNeighbor
		? chordWidthPx * spacing.overlapFraction
		: -spacing.clusterGapPx / 2;

export const maxBlobScaleFor = (size: LaneSize): number =>
	(size.heightPx - 2 * size.paddingPx) / SHAPE_DIAMETER;

export const layoutLaneBlobs = (
	chords: LaneChord[],
	size: LaneSize,
	spacing: LaneSpacing
): LaneBlob[] =>
	chords.map((chord, index) => {
		const startPx = chord.startFraction * size.widthPx;
		const endPx = chord.endFraction * size.widthPx;
		const chordWidthPx = endPx - startPx;
		const leftPx =
			startPx -
			edgeExtensionPx(
				sharesCluster(chords, spacing, index - 1, index),
				chordWidthPx,
				spacing
			);
		const rightPx =
			endPx +
			edgeExtensionPx(
				sharesCluster(chords, spacing, index, index + 1),
				chordWidthPx,
				spacing
			);
		const scaleX =
			Math.max(rightPx - leftPx, MIN_BLOB_WIDTH_PX) / SHAPE_DIAMETER;
		return {
			centerX: (leftPx + rightPx) / 2,
			scaleX,
			scaleY: Math.min(maxBlobScaleFor(size), scaleX * MAX_ASPECT_RATIO)
		};
	});

export const activeChordIndexAt = (
	chords: FractionSpan[],
	progressFraction: number
): number => chords.findIndex((chord) => isActiveAt(chord, progressFraction));

export const chordGlideAt = (
	chords: FractionSpan[],
	progressFraction: number,
	glideStartFraction: number = GLIDE_START_FRACTION
): ChordGlide | null => {
	if (chords.length === 0) return null;
	const fromIndex = Math.max(
		chords.filter((chord) => chord.startFraction <= progressFraction).length -
			1,
		0
	);
	const toIndex = Math.min(fromIndex + 1, chords.length - 1);
	const chord = chords[fromIndex];
	const chordLength = chord.endFraction - chord.startFraction;
	const chordProgress =
		chordLength > 0
			? clampUnit((progressFraction - chord.startFraction) / chordLength)
			: 0;
	const glideProgress = clampUnit(
		(chordProgress - glideStartFraction) / (1 - glideStartFraction)
	);
	return { fromIndex, toIndex, t: easeCubicInOut(glideProgress) };
};

export const gliderFor = (
	chords: LaneChord[],
	blobs: LaneBlob[],
	glide: ChordGlide
): Glider => {
	const from = chords[glide.fromIndex];
	const to = chords[glide.toIndex];
	const fromBlob = blobs[glide.fromIndex];
	const toBlob = blobs[glide.toIndex];
	const stretch = 1 + GLIDER_STRETCH * Math.sin(Math.PI * glide.t);
	const colorT = clampUnit(glide.t * GLIDER_COLOR_LEAD);
	return {
		path: morphedShapePath(from.appearance.shape, to.appearance.shape, glide.t),
		fill: interpolateRgb(
			from.appearance.colors.fill,
			to.appearance.colors.fill
		)(colorT),
		centerX: lerp(fromBlob.centerX, toBlob.centerX, glide.t),
		scaleX:
			lerp(fromBlob.scaleX, toBlob.scaleX, glide.t) * GLIDER_SCALE * stretch,
		scaleY:
			(lerp(fromBlob.scaleY, toBlob.scaleY, glide.t) * GLIDER_SCALE) / stretch,
		labelIndex: glide.t < HALF ? glide.fromIndex : glide.toIndex
	};
};

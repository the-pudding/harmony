// Section 3's charts, drawn with the songs themselves: each song is a dot in
// a 100% stacked bar of its effective-progression band (≈1 at the bottom, 6+
// on top), oldest songs on the left. "effectiveProgressions" is one bar of
// every song; "effectiveProgressionsByDecade" splits it into a bar per
// decade, so going from one to the other the bar comes apart by decade.
// Songs with no effective count aren't placed.
import {
	HOMOGENEITY_BANDS,
	homogeneityBandFor
} from "$routes/demo/shared/progressionHomogeneity.js";
import { GUIDE_BOTTOM_RIGHT_CLEARANCE } from "$components/hexmap/components/scatter/constants.js";
import type { SongTable } from "../songTable.js";
import { hashUnit } from "./seededRandom.js";
import { yearStagger } from "./stagger.js";
import {
	PHONE_MAX_FRAME_WIDTH,
	STAR_RADIUS,
	type TimelineParams
} from "./timeline.js";
import type { Guide, Layout, LayoutFrame, LayoutResult } from "./types.js";

export type EffectiveProgressionsParams = TimelineParams;

// The band every chart draws attention to: songs that are about one loop.
export const LOOP_BAND = HOMOGENEITY_BANDS[0];

// Room in px, inside the frame, for the band labels on the left and the
// labels under the bars; the right side stays clear of the mute button.
const GUTTER_PX = { phone: 40, wide: 88 };
const RIGHT_PX = GUIDE_BOTTOM_RIGHT_CLEARANCE;
const SINGLE_BAR_FOOTER_PX = 20;
const DECADE_FOOTER_PX = 40;
// Between stacked bands, and between decade bars.
const BAND_GAP_PX = 3;
const DECADE_GAP_PX = { phone: 4, wide: 14 };
// A dot's radius as a share of the spacing between dots.
const RADIUS_PER_SPACING = 0.36;
const MIN_RADIUS = 1;
const LABEL_GAP_PX = 8;
const LINE_PX = 14;

type Rect = { x: number; y: number; width: number; height: number };

type Bar = {
	// Song indexes, oldest first.
	songs: readonly number[];
	rect: Rect;
	label?: string;
};

type PackedBar = {
	// One per band, bottom to top; empty bands have no height.
	segments: {
		band: (typeof HOMOGENEITY_BANDS)[number];
		share: number;
		rect: Rect;
	}[];
	spacing: number;
};

const phoneSized = (frame: LayoutFrame) => frame.width < PHONE_MAX_FRAME_WIDTH;

const bandIndexOf = (songs: SongTable): Int8Array => {
	const bandIndex = new Int8Array(songs.count).fill(-1);
	for (let index = 0; index < songs.count; index++) {
		const homogeneity = songs.homogeneity[index];
		if (!homogeneity) continue;
		const band = homogeneityBandFor(homogeneity.effectiveProgressionCount);
		bandIndex[index] = HOMOGENEITY_BANDS.indexOf(band);
	}
	return bandIndex;
};

// Placed songs, oldest first; songs from the same year in a seeded order.
const chronological = (songs: SongTable, bandIndex: Int8Array): number[] => {
	const placed: number[] = [];
	const tieBreak = new Float64Array(songs.count);
	for (let index = 0; index < songs.count; index++) {
		if (bandIndex[index] < 0) continue;
		placed.push(index);
		tieBreak[index] = hashUnit(songs.keys[index], "x");
	}
	return placed.sort(
		(a, b) => songs.year[a] - songs.year[b] || tieBreak[a] - tieBreak[b]
	);
};

// Stacks a bar's bands in its rect (px, y up) and fills each band's
// rectangle with its songs in a grid, column by column, so earlier songs sit
// left of later ones. Writes px positions into x and y.
const packBar = (
	{ songs, rect }: Bar,
	bandIndex: Int8Array,
	x: Float32Array,
	y: Float32Array
): PackedBar => {
	const byBand = HOMOGENEITY_BANDS.map(() => [] as number[]);
	for (const index of songs) byBand[bandIndex[index]].push(index);
	const stackHeight =
		rect.height - BAND_GAP_PX * (HOMOGENEITY_BANDS.length - 1);
	const spacing = Math.sqrt(
		(rect.width * stackHeight) / Math.max(1, songs.length)
	);
	let bottom = rect.y;
	const segments = byBand.map((members, band) => {
		const share = songs.length === 0 ? 0 : members.length / songs.length;
		const segment = {
			x: rect.x,
			y: bottom,
			width: rect.width,
			height: stackHeight * share
		};
		if (members.length > 0) {
			bottom += segment.height + BAND_GAP_PX;
			const rows = Math.max(1, Math.round(segment.height / spacing));
			const columns = Math.ceil(members.length / rows);
			const cellWidth = segment.width / columns;
			const cellHeight = segment.height / rows;
			members.forEach((index, order) => {
				x[index] = segment.x + (Math.floor(order / rows) + 0.5) * cellWidth;
				y[index] = segment.y + ((order % rows) + 0.5) * cellHeight;
			});
		}
		return { band: HOMOGENEITY_BANDS[band], share, rect: segment };
	});
	return { segments, spacing };
};

const percent = (share: number) => `${Math.round(share * 100)}%`;

// The center of a rect's left edge, as a label in the gutter beside it.
const gutterLabel = (
	frame: LayoutFrame,
	rect: Rect,
	text: string,
	options: { color?: string; weight?: "regular" | "bold"; dy?: number } = {}
): Guide => ({
	kind: "label",
	text,
	x: (rect.x - LABEL_GAP_PX) / frame.width,
	y: (rect.y + rect.height / 2 + (options.dy ?? 0)) / frame.height,
	align: "right",
	color: options.color,
	weight: options.weight
});

// Lays out the bars, converts px to 0–1 across the frame and leaves songs
// that aren't in any bar unplaced.
const chartLayout = (
	name: string,
	songs: SongTable,
	frame: LayoutFrame,
	bars: (placed: readonly number[]) => Bar[],
	guidesFor: (packed: PackedBar[], bars: Bar[]) => Guide[]
): LayoutResult => {
	const bandIndex = bandIndexOf(songs);
	const x = new Float32Array(songs.count).fill(NaN);
	const y = new Float32Array(songs.count).fill(NaN);
	const chartBars = bars(chronological(songs, bandIndex));
	const packed = chartBars.map((bar) => packBar(bar, bandIndex, x, y));
	for (let index = 0; index < songs.count; index++) {
		x[index] /= frame.width;
		y[index] /= frame.height;
	}
	const spacing = Math.min(...packed.map((bar) => bar.spacing));
	return {
		name,
		x,
		y,
		framed: true,
		aggregate: "none",
		color: "star",
		fill: Array.from(bandIndex, (band) =>
			band < 0 ? null : HOMOGENEITY_BANDS[band].color
		),
		pointRadius: Math.max(
			MIN_RADIUS,
			Math.min(STAR_RADIUS, spacing * RADIUS_PER_SPACING)
		),
		stagger: yearStagger(songs),
		guides: guidesFor(packed, chartBars)
	};
};

export const effectiveProgressionsLayout: Layout<EffectiveProgressionsParams> =
	{
		name: "effectiveProgressions",
		framed: true,
		compute: ({ songs, frame }) => {
			const gutter = phoneSized(frame) ? GUTTER_PX.phone : GUTTER_PX.wide;
			const rect = {
				x: gutter,
				y: SINGLE_BAR_FOOTER_PX,
				width: frame.width - gutter - RIGHT_PX,
				height: frame.height - SINGLE_BAR_FOOTER_PX
			};
			const footerY = SINGLE_BAR_FOOTER_PX / 2 / frame.height;
			return chartLayout(
				"effectiveProgressions",
				songs,
				frame,
				(placed) => [{ songs: placed, rect }],
				([{ segments }]) => [
					...segments.flatMap(({ band, share, rect: segment }) =>
						share === 0
							? []
							: [
									gutterLabel(frame, segment, band.shortLabel, {
										color: band.color,
										weight: "bold",
										dy: LINE_PX / 2
									}),
									gutterLabel(frame, segment, percent(share), {
										dy: -LINE_PX / 2
									})
								]
					),
					{
						kind: "label",
						text: "← older",
						x: rect.x / frame.width,
						y: footerY,
						align: "left"
					},
					{
						kind: "label",
						text: "newer →",
						x: (rect.x + rect.width) / frame.width,
						y: footerY,
						align: "right"
					}
				]
			);
		}
	};

const DECADE_LENGTH = 10;

export const effectiveProgressionsByDecadeLayout: Layout<EffectiveProgressionsParams> =
	{
		name: "effectiveProgressionsByDecade",
		framed: true,
		compute: ({ songs, frame }) => {
			const phone = phoneSized(frame);
			const gutter = phone ? GUTTER_PX.phone : GUTTER_PX.wide;
			const gap = phone ? DECADE_GAP_PX.phone : DECADE_GAP_PX.wide;
			return chartLayout(
				"effectiveProgressionsByDecade",
				songs,
				frame,
				(placed) => {
					const byDecade = new Map<number, number[]>();
					for (const index of placed) {
						const decade =
							Math.floor(songs.year[index] / DECADE_LENGTH) * DECADE_LENGTH;
						const members = byDecade.get(decade) ?? [];
						members.push(index);
						byDecade.set(decade, members);
					}
					const decades = [...byDecade].sort(([a], [b]) => a - b);
					const width =
						(frame.width - gutter - RIGHT_PX - gap * (decades.length - 1)) /
						decades.length;
					return decades.map(([decade, members], column) => ({
						songs: members,
						label: phone ? `’${String(decade).slice(2)}` : `${decade}s`,
						rect: {
							x: gutter + column * (width + gap),
							y: DECADE_FOOTER_PX,
							width,
							height: frame.height - DECADE_FOOTER_PX
						}
					}));
				},
				(packed, bars) => [
					// Bands are named beside the first decade's bar.
					...packed[0].segments.flatMap(({ band, share, rect }) =>
						share === 0
							? []
							: [
									gutterLabel(frame, rect, band.shortLabel, {
										color: band.color,
										weight: "bold"
									})
								]
					),
					...packed.flatMap(({ segments: [loop] }, column) => {
						const { rect } = bars[column];
						const centerX = (rect.x + rect.width / 2) / frame.width;
						const outset = BAND_GAP_PX / 2;
						return [
							{
								kind: "box",
								x: (loop.rect.x - outset) / frame.width,
								y: (loop.rect.y - outset) / frame.height,
								width: (loop.rect.width + outset * 2) / frame.width,
								height: (loop.rect.height + outset * 2) / frame.height
							},
							{
								kind: "label",
								text: percent(loop.share),
								x: centerX,
								y: (DECADE_FOOTER_PX - LINE_PX / 2 - 2) / frame.height,
								align: "center",
								color: LOOP_BAND.color,
								weight: "bold"
							},
							{
								kind: "label",
								text: bars[column].label ?? "",
								x: centerX,
								y: (DECADE_FOOTER_PX - LINE_PX * 1.5 - 4) / frame.height,
								align: "center"
							}
						] satisfies Guide[];
					})
				]
			);
		}
	};

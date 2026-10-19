import { describe, expect, it } from "vitest";
import { morphedShapePath } from "./chord-viz/chordShapes.js";
import {
	GLIDE_START_FRACTION,
	HOVER_STROKE_ON_DARK,
	HOVER_STROKE_ON_LIGHT,
	LANE_BACKGROUND_BLACK,
	LANE_BACKGROUND_WHITE,
	SHAPE_DIAMETER,
	activeChordIndexAt,
	byProgression,
	chordGlideAt,
	clustersOf,
	glideTouchesCluster,
	gliderFor,
	hoverStrokeForBackground,
	laneChordsOf,
	layoutLaneBlobs,
	maxBlobScaleFor,
	type LaneSize,
	type LaneSpacing
} from "./chordLanes.js";
import { buildChordTimeline, type SongSectionChords } from "./chordTimeline.js";

const PALETTE = { fill: "#123456", border: "#654321" };

const SECTIONS: SongSectionChords[] = [
	{
		id: "verse",
		name: "Verse",
		chords: [
			{ name: "C", roman: "I" },
			{ name: "G", roman: "V" },
			{ name: "F", roman: "IV" },
			{ name: "Am", roman: "vi" }
		],
		groups: [
			{
				startIndex: 0,
				length: 2,
				palette: PALETTE,
				chordProgression: "I-V",
				isStrictSubset: false
			}
		]
	}
];

const CHORD_COUNT = 4;
const timeline = buildChordTimeline(
	SECTIONS,
	Array.from({ length: CHORD_COUNT }, (_, index) => index / CHORD_COUNT)
);
const chords = laneChordsOf(timeline, "major");

const SIZE: LaneSize = { widthPx: 400, heightPx: 64, paddingPx: 6 };
const SPACING: LaneSpacing = {
	clusterKeyOf: byProgression,
	overlapFraction: 0.5,
	clusterGapPx: 10
};
const CHORD_WIDTH_PX = SIZE.widthPx / CHORD_COUNT;

describe("laneChordsOf", () => {
	it("assigns chords inside a progression the group's key and others their own", () => {
		expect(chords[0].progressionKey).toBe(chords[1].progressionKey);
		expect(chords[2].progressionKey).toBe(chords[2].key);
		expect(chords[3].progressionKey).toBe(chords[3].key);
	});

	it("looks up a shape for each roman numeral", () => {
		expect(chords[0].appearance.shape).toBe("stableTriangle");
		expect(chords[1].appearance.shape).toBe("unstableTriangle");
	});
});

describe("clustersOf", () => {
	const clusters = clustersOf(chords, byProgression);

	it("groups a progression's chords and leaves standalone chords alone", () => {
		expect(clusters.map((cluster) => cluster.indices)).toEqual([
			[0, 1],
			[2],
			[3]
		]);
	});

	it("touches both clusters a glide spans", () => {
		const glide = { fromIndex: 1, toIndex: 2, t: 0.5 };
		expect(
			clusters.map((cluster) => glideTouchesCluster(glide, cluster))
		).toEqual([true, true, false]);
	});
});

describe("layoutLaneBlobs", () => {
	const blobs = layoutLaneBlobs(chords, SIZE, SPACING);
	const rightEdgeOf = (index: number) =>
		blobs[index].centerX + (blobs[index].scaleX * SHAPE_DIAMETER) / 2;
	const leftEdgeOf = (index: number) =>
		blobs[index].centerX - (blobs[index].scaleX * SHAPE_DIAMETER) / 2;

	it("overlaps chords within the same progression", () => {
		expect(rightEdgeOf(0)).toBeGreaterThan(leftEdgeOf(1));
	});

	it("leaves a gap between chords in different progressions", () => {
		expect(leftEdgeOf(2) - rightEdgeOf(1)).toBeCloseTo(SPACING.clusterGapPx);
	});

	it("extends joined edges by the overlap fraction of the chord width", () => {
		expect(rightEdgeOf(0)).toBeCloseTo(
			CHORD_WIDTH_PX * (1 + SPACING.overlapFraction)
		);
	});

	it("caps vertical scale to the lane height", () => {
		blobs.forEach((blob) =>
			expect(blob.scaleY).toBeLessThanOrEqual(maxBlobScaleFor(SIZE))
		);
	});
});

describe("activeChordIndexAt", () => {
	it("returns the chord spanning the progress fraction", () => {
		expect(activeChordIndexAt(chords, 0.3)).toBe(1);
	});

	it("returns -1 past the last chord", () => {
		expect(activeChordIndexAt(chords, 1)).toBe(-1);
	});
});

describe("chordGlideAt", () => {
	it("returns null with no chords", () => {
		expect(chordGlideAt([], 0.5)).toBeNull();
	});

	it("rests on the current chord before the glide starts", () => {
		expect(chordGlideAt(chords, 0.25)).toEqual({
			fromIndex: 1,
			toIndex: 2,
			t: 0
		});
	});

	it("arrives at the next chord at the end of the current one", () => {
		const justBeforeEnd = 0.5 - Number.EPSILON;
		expect(chordGlideAt(chords, justBeforeEnd)?.t).toBeCloseTo(1);
	});

	it("is halfway midway through the glide window", () => {
		const chordLength = 1 / CHORD_COUNT;
		const midGlideChordProgress = (GLIDE_START_FRACTION + 1) / 2;
		const midGlide = chordLength + chordLength * midGlideChordProgress;
		expect(chordGlideAt(chords, midGlide)?.t).toBeCloseTo(0.5);
	});

	it("stays on the last chord at the end of the song", () => {
		expect(chordGlideAt(chords, 1)).toMatchObject({
			fromIndex: CHORD_COUNT - 1,
			toIndex: CHORD_COUNT - 1
		});
	});
});

describe("gliderFor", () => {
	const blobs = layoutLaneBlobs(chords, SIZE, SPACING);

	it("sits on the from chord at the start of a glide", () => {
		const glider = gliderFor(chords, blobs, { fromIndex: 0, toIndex: 1, t: 0 });
		expect(glider.centerX).toBeCloseTo(blobs[0].centerX);
		expect(glider.labelIndex).toBe(0);
	});

	it("matches the next chord's color and position at the end of a glide", () => {
		const glider = gliderFor(chords, blobs, { fromIndex: 0, toIndex: 1, t: 1 });
		expect(glider.centerX).toBeCloseTo(blobs[1].centerX);
		expect(glider.fill).toBe("rgb(56, 189, 248)");
		expect(glider.labelIndex).toBe(1);
	});
});

describe("morphedShapePath", () => {
	it("produces an SVG path for any shape pair", () => {
		expect(morphedShapePath("stableTriangle", "spikey", 0.5)).toMatch(/^M/);
	});

	it("differs between endpoints of a morph", () => {
		expect(morphedShapePath("stableTriangle", "circleish", 0)).not.toBe(
			morphedShapePath("stableTriangle", "circleish", 1)
		);
	});
});

describe("hoverStrokeForBackground", () => {
	it("uses a dark stroke on white and a light stroke on black", () => {
		expect(hoverStrokeForBackground(LANE_BACKGROUND_WHITE)).toBe(
			HOVER_STROKE_ON_LIGHT
		);
		expect(hoverStrokeForBackground(LANE_BACKGROUND_BLACK)).toBe(
			HOVER_STROKE_ON_DARK
		);
	});
});

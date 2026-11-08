import { zoomIdentity } from "d3";
import { describe, expect, it } from "vitest";
import { OUTLINED_LABEL_LINE_HEIGHT } from "./constants.js";
import { resolveClick, type ClickInput } from "./clickIntent.js";
import { hexKeyAt, labelSongKeyAt, nearestSongAt } from "./hitTesting.js";
import { binIntoHexes } from "../../embedding/layout/hexBins.js";

const dotsClick: ClickInput = {
	atHexZoom: false,
	hexMode: false,
	labelSongKey: null,
	outlinedSongKey: null,
	songKey: null,
	regionName: null,
	onHex: false,
	playingSongKey: null,
	openSongId: null,
	selectedSongKey: null,
	canToggleChords: false,
	movable: true,
	hoverable: true
};
const hexDotsClick: ClickInput = {
	...dotsClick,
	hexMode: true,
	canToggleChords: true
};
const hexZoomClick: ClickInput = {
	...dotsClick,
	hexMode: true,
	atHexZoom: true
};

describe("resolveClick", () => {
	it("selects a song in dots mode, and deselects it on a second click", () => {
		expect(resolveClick({ ...dotsClick, songKey: "a" })).toEqual([
			{ kind: "select", songKey: "a" }
		]);
		expect(
			resolveClick({ ...dotsClick, songKey: "a", selectedSongKey: "a" })
		).toEqual([{ kind: "select", songKey: null }]);
	});

	it("reports a miss to onOutlinedSongClick, then clears the selection", () => {
		expect(resolveClick(dotsClick)).toEqual([
			{ kind: "outlinedSongClick", songKey: null },
			{ kind: "select", songKey: null }
		]);
	});

	it("doesn't select when not hoverable", () => {
		expect(
			resolveClick({ ...dotsClick, songKey: "a", hoverable: false })
		).toEqual([]);
	});

	it("toggles chords from a label, and does nothing else", () => {
		expect(
			resolveClick({ ...hexDotsClick, labelSongKey: "a", songKey: "b" })
		).toEqual([{ kind: "toggleChords", songKey: "a" }]);
	});

	it("only deselects when clicking off the dots while a song is active", () => {
		expect(resolveClick({ ...hexDotsClick, openSongId: "x" })).toEqual([
			{ kind: "outlinedSongClick", songKey: null }
		]);
		expect(
			resolveClick({
				...hexDotsClick,
				playingSongKey: "p",
				outlinedSongKey: "p",
				songKey: "p"
			})
		).toEqual([{ kind: "outlinedSongClick", songKey: null }]);
	});

	it("opens a plain song's chords and picks its cluster at hex dot zoom, stopping what's playing", () => {
		expect(
			resolveClick({
				...hexDotsClick,
				songKey: "a",
				playingSongKey: "p",
				regionName: "axis"
			})
		).toEqual([
			{ kind: "outlinedSongClick", songKey: null },
			{ kind: "clusterClick", name: "axis", songKey: "a" },
			{ kind: "toggleChords", songKey: "a" }
		]);
		expect(resolveClick({ ...hexDotsClick, songKey: "a" })).toEqual([
			{ kind: "clusterClick", name: null, songKey: "a" },
			{ kind: "toggleChords", songKey: "a" }
		]);
	});

	it("plays an outlined song and reports its cluster at hex dot zoom", () => {
		expect(
			resolveClick({
				...hexDotsClick,
				outlinedSongKey: "o",
				songKey: "o",
				regionName: "axis"
			})
		).toEqual([
			{ kind: "outlinedSongClick", songKey: "o" },
			{ kind: "clusterClick", name: "axis", songKey: "o" },
			{ kind: "select", songKey: "o" }
		]);
	});

	it("reports the cluster and zooms in when a hex is clicked", () => {
		expect(
			resolveClick({ ...hexZoomClick, onHex: true, regionName: "axis" })
		).toEqual([
			{ kind: "outlinedSongClick", songKey: null },
			{ kind: "clusterClick", name: "axis", songKey: null },
			{ kind: "zoomToHex" }
		]);
	});

	it("doesn't zoom on a hex when the map isn't movable, or off any hex", () => {
		const kinds = (input: ClickInput) =>
			resolveClick(input).map((action) => action.kind);
		expect(kinds({ ...hexZoomClick, onHex: true, movable: false })).toEqual([
			"outlinedSongClick",
			"clusterClick"
		]);
		expect(kinds(hexZoomClick)).toEqual(["outlinedSongClick", "clusterClick"]);
	});
});

describe("hit-testing", () => {
	const screens = new Map([
		["a", { x: 0, y: 0 }],
		["b", { x: 10, y: 0 }]
	]);
	const screenOf = (songKey: string) => screens.get(songKey) ?? null;

	it("finds the nearest song within range", () => {
		expect(nearestSongAt({ x: 7, y: 0 }, ["a", "b"], screenOf, 12)).toBe("b");
		expect(nearestSongAt({ x: 50, y: 0 }, ["a", "b"], screenOf, 12)).toBe(null);
		expect(nearestSongAt({ x: 1, y: 0 }, ["missing"], screenOf, 12)).toBe(null);
	});

	it("finds the occupied hex under the pointer, through the zoom", () => {
		const bins = binIntoHexes([{ songKey: "a", x: 100, y: 100 }], 10);
		const transform = zoomIdentity.translate(50, 0).scale(2);
		expect(
			hexKeyAt({ x: 250, y: 200 }, transform, { radius: 10, bins })
		).not.toBe(null);
		expect(hexKeyAt({ x: 0, y: 0 }, transform, { radius: 10, bins })).toBe(
			null
		);
	});

	it("counts a hovered label's hint row, and only the playing label", () => {
		const hitAreas = new Map([
			["a", { box: { left: 0, right: 50, top: 0, bottom: 20 }, hintRight: 80 }],
			[
				"b",
				{ box: { left: 100, right: 150, top: 0, bottom: 20 }, hintRight: 160 }
			]
		]);
		const below = { x: 70, y: 20 + OUTLINED_LABEL_LINE_HEIGHT / 2 };
		const options = { playingSongKey: null, hoveredLabelSongKey: null };
		expect(labelSongKeyAt(below, hitAreas, options)).toBe(null);
		expect(
			labelSongKeyAt(below, hitAreas, { ...options, hoveredLabelSongKey: "a" })
		).toBe("a");
		expect(
			labelSongKeyAt({ x: 120, y: 10 }, hitAreas, {
				...options,
				playingSongKey: "a"
			})
		).toBe(null);
	});
});

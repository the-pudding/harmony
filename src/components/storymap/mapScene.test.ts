import { afterEach, describe, expect, it, vi } from "vitest";
import copy from "$data/copy.json";
import type { CopyMap } from "$data/copy.json";
import { DEFAULT_MAP_SCENE, parseMapScene, type MapScene } from "./mapScene.js";

// Index's mapPropsFromCopy before scenes existed, verbatim.
const parseBoolean = (value: unknown) =>
	value === undefined ? undefined : String(value).trim() === "true";

const legacyMapProps = (map: Record<string, any>) => {
	const props = {
		focusCluster: map.focusCluster?.trim() || undefined,
		showLabels: map.showLabels
			? String(map.showLabels)
					.split(",")
					.map((name) => name.trim())
					.filter(Boolean)
			: undefined,
		movable: parseBoolean(map.movable),
		hoverable: parseBoolean(map.hoverable),
		hideLabels: parseBoolean(map.hideLabels),
		rotateLabels: parseBoolean(map.rotateLabels),
		centered: parseBoolean(map.centered),
		hidePlayer: parseBoolean(map.hidePlayer),
		highlightSongs: map.highlightSongs
			? [map.highlightSongs]
					.flat()
					.flatMap((value: unknown) => String(value).split(","))
					.map((songKey: string) => songKey.trim())
					.filter(Boolean)
			: undefined
	};
	return Object.fromEntries(
		Object.entries(props).filter(([, value]) => value !== undefined)
	);
};

// What HexMap did with each prop when Index left it out.
const HEXMAP_DEFAULTS = {
	focusCluster: undefined,
	showLabels: undefined,
	movable: true,
	hoverable: true,
	hideLabels: false,
	rotateLabels: false,
	centered: false,
	hidePlayer: false,
	highlightSongs: []
};

// A scene as the props HexMap used to be given.
const propsFromScene = (scene: MapScene) => ({
	focusCluster: scene.camera.kind === "cluster" ? scene.camera.name : undefined,
	showLabels: scene.labels.only ?? undefined,
	movable: scene.interaction.movable,
	hoverable: scene.interaction.hoverable,
	hideLabels: scene.labels.hidden,
	rotateLabels: scene.labels.rotate,
	centered: scene.camera.kind === "home" && scene.camera.centered,
	hidePlayer: scene.player.hidden,
	highlightSongs: [...scene.songs.highlighted]
});

const slides = copy.sections.flatMap((section) => section.slides);
const mapBlocks = slides.flatMap((slide) => (slide.map ? [slide.map] : []));

// Keys added by the story map; blocks using none of them still parse to what
// HexMap was given before scenes existed.
const NEW_KEYS = [
	"layout",
	"axisLabel",
	"focusSong",
	"onlySongs",
	"playableSongs",
	"dimmed",
	"followVideo",
	"litVideoSongs"
];
const usesNewKeys = (map: Record<string, unknown>) =>
	NEW_KEYS.some((key) => key in map);
const legacyBlocks = mapBlocks.filter((map) => !usesNewKeys(map));
const sceneBlocks = mapBlocks.filter(usesNewKeys);

describe("parseMapScene on the real copy", () => {
	it("finds the map blocks", () => {
		expect(mapBlocks.length).toBeGreaterThan(10);
	});

	it.each(legacyBlocks.map((map, index) => [index, map] as const))(
		"block %i parses to what mapPropsFromCopy gave HexMap",
		(_, map) => {
			const scene = parseMapScene(map);
			expect(scene).not.toBeNull();
			expect(propsFromScene(scene!)).toEqual({
				...HEXMAP_DEFAULTS,
				...legacyMapProps(map)
			});
			// These blocks use none of the new keys.
			expect(scene!.layout).toEqual({ name: "umap" });
			expect(scene!.songs).toMatchObject({
				only: null,
				playable: [],
				dimmed: false
			});
			expect(scene!.media).toEqual({ followVideo: null, litVideoSongs: null });
		}
	);

	it("parses a spot check of today's copy", () => {
		const landing = slides.find(
			(slide) => slide.stage?.component === "Landing"
		);
		expect(parseMapScene(landing!.map)).toEqual({
			...DEFAULT_MAP_SCENE,
			camera: { kind: "home", centered: true },
			labels: { hidden: false, only: null, rotate: true },
			interaction: { movable: false, hoverable: false, tooltip: "basic" }
		});
		const focused = mapBlocks.find((map) => map.focusCluster);
		expect(parseMapScene(focused)!.camera).toEqual({
			kind: "cluster",
			name: focused!.focusCluster!.trim()
		});
	});

	it("parses the intro's story-map blocks", () => {
		expect(sceneBlocks.length).toBeGreaterThanOrEqual(5);
		const [dot, sky, dimmed, follow, lit] = sceneBlocks.map(
			(map) => parseMapScene(map)!
		);
		expect(dot).toMatchObject({
			layout: { name: "timeline", axisLabel: null },
			camera: { kind: "song", songKey: "journey__dont-stop-believin" },
			songs: {
				only: ["journey__dont-stop-believin"],
				playable: ["journey__dont-stop-believin"]
			},
			interaction: { movable: false, hoverable: false }
		});
		expect(sky).toMatchObject({
			layout: { name: "timeline", axisLabel: "time →" },
			songs: { only: null, playable: [], dimmed: false }
		});
		for (const scene of [dot, sky, dimmed, follow, lit]) {
			expect(scene.interaction.tooltip).toBe("basic");
		}
		expect(dimmed.songs.dimmed).toBe(true);
		expect(follow.media).toEqual({
			followVideo: "examples",
			litVideoSongs: null
		});
		expect(lit.media).toEqual({ followVideo: null, litVideoSongs: "examples" });
	});

	it("shows no map for slides without a visible block", () => {
		for (const slide of slides) {
			const parsed = parseMapScene(slide.map);
			expect(parsed === null).toBe(
				!slide.map || String(slide.map.visible).trim() !== "true"
			);
		}
	});
});

describe("parseMapScene", () => {
	const parse = (map: Partial<CopyMap>) =>
		parseMapScene({ visible: "true", ...map })!;

	it("is null without a block or without visible: true", () => {
		expect(parseMapScene(undefined)).toBeNull();
		expect(parseMapScene(null)).toBeNull();
		expect(parseMapScene({})).toBeNull();
		expect(parseMapScene({ visible: "false" })).toBeNull();
		expect(parseMapScene({ visible: " true " })).not.toBeNull();
	});

	it("is the default scene when only visible is set", () => {
		expect(parse({})).toEqual(DEFAULT_MAP_SCENE);
	});

	it("reads layout and axisLabel", () => {
		expect(parse({ layout: "timeline" }).layout).toEqual({
			name: "timeline",
			axisLabel: "time →"
		});
		expect(parse({ layout: "timeline", axisLabel: " years " }).layout).toEqual({
			name: "timeline",
			axisLabel: "years"
		});
		expect(parse({ layout: "timeline", axisLabel: " " }).layout).toEqual({
			name: "timeline",
			axisLabel: null
		});
		expect(parse({ layout: "umap" }).layout).toEqual({ name: "umap" });
	});

	it("reads focusSong, and lets focusCluster win", () => {
		expect(
			parse({ focusSong: " journey__dont-stop-believin " }).camera
		).toEqual({ kind: "song", songKey: "journey__dont-stop-believin" });
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(parse({ focusSong: "a", focusCluster: "doo wop" }).camera).toEqual({
			kind: "cluster",
			name: "doo wop"
		});
		expect(warn).toHaveBeenCalled();
	});

	it("reads song lists as lists or comma strings", () => {
		expect(parse({ onlySongs: "a, b ,,c" }).songs.only).toEqual([
			"a",
			"b",
			"c"
		]);
		expect(parse({ onlySongs: ["a", "b"] }).songs.only).toEqual(["a", "b"]);
		expect(parse({ onlySongs: "" }).songs.only).toBeNull();
		expect(parse({ playableSongs: ["a", "b, c"] }).songs.playable).toEqual([
			"a",
			"b",
			"c"
		]);
		expect(parse({ highlightSongs: "x,y" }).songs.highlighted).toEqual([
			"x",
			"y"
		]);
	});

	it("reads dimmed, and the media keys", () => {
		expect(parse({ dimmed: "true" }).songs.dimmed).toBe(true);
		expect(parse({ dimmed: "false" }).songs.dimmed).toBe(false);
		expect(
			parse({ followVideo: " examples ", litVideoSongs: "examples" }).media
		).toEqual({ followVideo: "examples", litVideoSongs: "examples" });
	});

	it("reads the tooltip, defaulting to full", () => {
		expect(parse({}).interaction.tooltip).toBe("full");
		expect(parse({ tooltip: " basic " }).interaction.tooltip).toBe("basic");
		expect(parse({ tooltip: "full" }).interaction.tooltip).toBe("full");
	});

	it("reads labels, interaction, centered and the player", () => {
		const scene = parse({
			hideLabels: "true",
			showLabels: "a, b",
			rotateLabels: "true",
			movable: "false",
			hoverable: "false",
			centered: "true",
			hidePlayer: "true"
		});
		expect(scene.labels).toEqual({
			hidden: true,
			only: ["a", "b"],
			rotate: true
		});
		expect(scene.interaction).toEqual({
			movable: false,
			hoverable: false,
			tooltip: "full"
		});
		expect(scene.camera).toEqual({ kind: "home", centered: true });
		expect(scene.player).toEqual({ hidden: true });
	});
});

describe("parseMapScene warnings", () => {
	afterEach(() => vi.restoreAllMocks());

	it("warns about unknown keys and layouts in dev, and still parses", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const scene = parseMapScene({
			visible: "true",
			focusClustr: "doo wop",
			layout: "sphere"
		} as CopyMap);
		expect(scene).toEqual(DEFAULT_MAP_SCENE);
		expect(warn).toHaveBeenCalledTimes(2);
		expect(warn.mock.calls[0][0]).toContain("focusClustr");
		expect(warn.mock.calls[1][0]).toContain("sphere");
	});

	it("warns about an unknown tooltip and uses full", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const scene = parseMapScene({ visible: "true", tooltip: "fancy" });
		expect(scene?.interaction.tooltip).toBe("full");
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("stays quiet for known keys", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		parseMapScene({ visible: "true", movable: "false", dimmed: "true" });
		expect(warn).not.toHaveBeenCalled();
	});
});

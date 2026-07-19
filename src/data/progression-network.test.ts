import { describe, expect, it } from "vitest";
import { buildProgressionNetwork } from "./progression-network.js";
import type { ProgressionGroup } from "./core-progressions.js";
import type { SongNetworkInput } from "./progression-network.js";

const groupA: ProgressionGroup = {
	name: "Test Group",
	description: "A test group",
	progressions: [
		{ name: "axis of awesome", chordProgression: "I-V-vi-IV", scale: "major", description: "" },
		{ name: "doo wop", chordProgression: "I-vi-IV-V", scale: "major", description: "" }
	]
};

const multiMatchSong: SongNetworkInput = {
	songKey: "artist__song-a",
	title: "Song A",
	artists: ["Artist"],
	matchingProgressions: ["I-V-vi-IV", "I-vi-IV-V"]
};

const emptyMatchSong: SongNetworkInput = {
	songKey: "artist__song-b",
	title: "Song B",
	artists: ["Artist"],
	matchingProgressions: []
};

const unknownProgressionSong: SongNetworkInput = {
	songKey: "artist__song-c",
	title: "Song C",
	artists: ["Artist"],
	matchingProgressions: ["VII-III-VI"]
};

describe("buildProgressionNetwork", () => {
	it("produces the right node counts by type", () => {
		const { nodes } = buildProgressionNetwork([groupA], [multiMatchSong, emptyMatchSong]);
		expect(nodes.filter((n) => n.type === "group")).toHaveLength(1);
		expect(nodes.filter((n) => n.type === "progression")).toHaveLength(2);
		expect(nodes.filter((n) => n.type === "song")).toHaveLength(2);
	});

	it("creates group-progression links for every progression in every group", () => {
		const { links } = buildProgressionNetwork([groupA], []);
		const gpl = links.filter((l) => l.type === "group-progression");
		expect(gpl).toHaveLength(2);
		expect(gpl.map((l) => l.target)).toContain("progression:I-V-vi-IV");
		expect(gpl.map((l) => l.target)).toContain("progression:I-vi-IV-V");
		expect(gpl.every((l) => l.source === "group:Test Group")).toBe(true);
	});

	it("creates song-progression links for each matched progression", () => {
		const { links } = buildProgressionNetwork([groupA], [multiMatchSong]);
		const spl = links.filter((l) => l.type === "song-progression");
		expect(spl).toHaveLength(2);
		expect(spl.every((l) => l.source === "song:artist__song-a")).toBe(true);
	});

	it("includes a song node even when it has no matches", () => {
		const { nodes, links } = buildProgressionNetwork([groupA], [emptyMatchSong]);
		expect(nodes.some((n) => n.id === "song:artist__song-b")).toBe(true);
		expect(links.filter((l) => l.type === "song-progression")).toHaveLength(0);
	});

	it("ignores song-progression links for progression strings not in any group", () => {
		const { links } = buildProgressionNetwork([groupA], [unknownProgressionSong]);
		expect(links.filter((l) => l.type === "song-progression")).toHaveLength(0);
	});

	it("node ids are stable and unique", () => {
		const { nodes } = buildProgressionNetwork([groupA], [multiMatchSong, emptyMatchSong]);
		const ids = nodes.map((n) => n.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("group node carries label and description", () => {
		const { nodes } = buildProgressionNetwork([groupA], []);
		const groupNode = nodes.find((n) => n.id === "group:Test Group");
		expect(groupNode?.type).toBe("group");
		if (groupNode?.type !== "group") return;
		expect(groupNode.label).toBe("Test Group");
		expect(groupNode.description).toBe("A test group");
	});

	it("progression node carries chordProgression and scale", () => {
		const { nodes } = buildProgressionNetwork([groupA], []);
		const prog = nodes.find((n) => n.id === "progression:I-V-vi-IV");
		expect(prog?.type).toBe("progression");
		if (prog?.type !== "progression") return;
		expect(prog.chordProgression).toBe("I-V-vi-IV");
		expect(prog.scale).toBe("major");
	});

	it("song node carries title and artists", () => {
		const { nodes } = buildProgressionNetwork([groupA], [multiMatchSong]);
		const songNode = nodes.find((n) => n.id === "song:artist__song-a");
		expect(songNode?.type).toBe("song");
		if (songNode?.type !== "song") return;
		expect(songNode.label).toBe("Song A");
		expect(songNode.artists).toEqual(["Artist"]);
	});
});

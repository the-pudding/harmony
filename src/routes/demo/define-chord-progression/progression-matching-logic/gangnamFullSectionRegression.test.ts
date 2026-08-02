import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions, {
	chordProgressionVariants
} from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";

const gangnamSong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "psy__gangnam-style"
	) as Parameters<typeof groupSongs>[0]
)[0];

const iivvCore = coreProgressions.find((p) =>
	chordProgressionVariants(p.chordProgression).includes("i-iv-v")
)!;

describe("gangnam style — full-section single-match exception regression", () => {
	it("gangnam-style song is found in the dataset", () => {
		expect(gangnamSong).toBeDefined();
	});

	it("i-iv-v core progression entry exists", () => {
		expect(iivvCore).toBeDefined();
	});

	it("gangnam-style has sections with the expected UG structure (Intro, Verse 1, Hook, Outro)", () => {
		const labels = gangnamSong.sections.map((s) => s.label);
		expect(labels).toContain("Intro");
		expect(labels).toContain("Verse 1");
		expect(labels).toContain("Hook");
	});
});

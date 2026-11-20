// 40 deterministic songs: two clusters plus strays, mixed and pure coverage.
import type { HexMapSnapshot } from "$data/hexMapSnapshot.js";
import { hashUnit } from "./layouts/seededRandom.js";

export const fixtureSnapshot = (): HexMapSnapshot => {
	const count = 40;
	const songKeys = Array.from({ length: count }, (_, i) => `song-${i}`);
	const progressionNames = ["I V vi IV", "vi IV I V", "I IV V"];
	return {
		songKeys,
		titles: songKeys.map((_, i) => `Title ${i}`),
		artists: songKeys.map((_, i) => [`Artist ${i % 7}`]),
		x: songKeys.map(
			(key, i) => (i < 15 ? 0 : i < 30 ? 10 : 5) + hashUnit(key, "x") * 3
		),
		y: songKeys.map(
			(key, i) => (i < 15 ? 0 : i < 30 ? 8 : -6) + hashUnit(key, "y") * 3
		),
		progressionNames,
		progressions: songKeys.map((key, i) =>
			i % 3 === 0
				? [i % 3, 90]
				: [
						0,
						20 + Math.round(hashUnit(key, "a") * 30),
						1,
						10 + Math.round(hashUnit(key, "b") * 30)
					]
		),
		popularity: songKeys.map(() => 0),
		years: songKeys.map((_, i) => (i === 5 ? 0 : 1960 + i)),
		clusters: [
			{
				name: "four chords",
				progressionNames: ["I V vi IV"],
				showLabel: true,
				songIndexes: Array.from({ length: 15 }, (_, i) => i)
			},
			{
				name: "axis",
				progressionNames: ["vi IV I V"],
				showLabel: true,
				songIndexes: Array.from({ length: 15 }, (_, i) => 15 + i)
			}
		]
	};
};

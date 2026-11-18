import { describe, expect, it } from "vitest";
import { hashSongKeys, type DensityCluster } from "./densityClusters.js";
import { nameProgressionClusters } from "./progressionClusterNames.js";

type Spec = {
	id: number;
	at: [number, number];
	// main progression → number of songs
	mains: Record<string, number>;
};

// Builds clusters whose songs sit in a tight blob at `at`, with the given
// main progressions.
const build = (specs: Spec[]) => {
	const clusters: DensityCluster[] = [];
	const main = new Map<string, string>();
	const position = new Map<string, { x: number; y: number }>();
	for (const { id, at, mains } of specs) {
		const songKeys: string[] = [];
		for (const [name, count] of Object.entries(mains)) {
			for (let index = 0; index < count; index++) {
				const songKey = `${id}-${name}-${index}`;
				songKeys.push(songKey);
				main.set(songKey, name);
				position.set(songKey, {
					x: at[0] + (index % 5) * 0.001,
					y: at[1] + Math.floor(index / 5) * 0.001
				});
			}
		}
		clusters.push({ id, songKeys, hash: hashSongKeys(songKeys) });
	}
	return { clusters, main, position };
};

const name = (specs: Spec[], minShare = 0.25) => {
	const { clusters, main, position } = build(specs);
	return nameProgressionClusters(clusters, main, position, minShare);
};

describe("nameProgressionClusters", () => {
	it("names a clear cluster after its main progression", () => {
		const [named] = name([
			{ id: 0, at: [0.5, 0.5], mains: { "doo wop": 18, axis: 4 } }
		]);
		expect(named.name).toBe("doo wop");
		expect(named.progressionNames).toEqual(["doo wop"]);
		expect(named.showLabel).toBe(true);
	});

	it("drops clusters without a common enough main progression", () => {
		expect(
			name([{ id: 0, at: [0.5, 0.5], mains: { a: 2, b: 2, c: 2, d: 2, e: 2 } }])
		).toEqual([]);
	});

	it("can hold some progressions to a stricter share", () => {
		const { clusters, main, position } = build([
			{
				id: 0,
				at: [0.1, 0.1],
				mains: { named: 7, a: 3, b: 3, c: 3, d: 3, e: 3, f: 3 }
			},
			{
				id: 1,
				at: [0.9, 0.9],
				mains: { "V-vi-V": 7, a: 3, b: 3, c: 3, d: 3, e: 3, f: 3 }
			}
		]);
		const named = nameProgressionClusters(clusters, main, position, (name) =>
			name === "named" ? 0.25 : 0.3
		);
		expect(named.map((n) => n.name)).toEqual(["named"]);
	});

	it("drops a near-tie between two progressions", () => {
		expect(
			name([
				{ id: 0, at: [0.5, 0.5], mains: { "doo wop": 15, "V-I-vi-IV": 14 } }
			])
		).toEqual([]);
	});

	it("keeps a clear leader over the runner-up", () => {
		const [named] = name([
			{ id: 0, at: [0.5, 0.5], mains: { "doo wop": 15, "V-I-vi-IV": 9 } }
		]);
		expect(named.progressionNames).toEqual(["doo wop"]);
	});

	it("merges nearby clusters with the same name", () => {
		const named = name([
			{ id: 0, at: [0.5, 0.5], mains: { "doo wop": 40 } },
			{ id: 1, at: [0.53, 0.5], mains: { "doo wop": 20 } }
		]);
		expect(named).toHaveLength(1);
		expect(named[0].cluster.songKeys).toHaveLength(60);
		expect(named[0].cluster.id).toBe(0);
	});

	it("doesn't merge nearby clusters with different names", () => {
		expect(
			name([
				{ id: 0, at: [0.5, 0.5], mains: { "doo wop": 40 } },
				{ id: 1, at: [0.53, 0.5], mains: { axis: 20 } }
			])
		).toHaveLength(2);
	});

	it("leaves a far-away repeat unlabeled, under the same name", () => {
		const named = name([
			{ id: 0, at: [0.1, 0.1], mains: { "doo wop": 40 } },
			{ id: 1, at: [0.9, 0.9], mains: { "doo wop": 20, axis: 8 } }
		]);
		expect(named.map((n) => [n.name, n.showLabel])).toEqual([
			["doo wop", true],
			["doo wop", false]
		]);
	});
});

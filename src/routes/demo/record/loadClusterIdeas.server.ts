import fs from "fs";
import path from "path";
import { applyHandReviewedCorrections } from "$data/applyHandReviewedCorrections.js";
import { syncedSongClusters } from "$data/syncedSongs.js";
import { resolveSongKey } from "../../../chord-processing/songIdentity.js";
import type { SongInput } from "../../../chord-processing/types.js";
import type { HexMapSnapshot } from "$data/hexMapSnapshot.js";
import {
	buildClusterKeyIdeas,
	type ClusterIdeaCandidate,
	type ClusterIdeasByMode,
	type ClusterKeyIdea
} from "./clusterIdeas.js";

const DATA_DIRECTORY = path.join(process.cwd(), "static", "data");

type SongFacts = {
	keyLabels: Set<string>;
	year: number;
	popularity: number;
};

// Key, earliest year and best popularity per song, from every section,
// with the hand-reviewed key corrections applied.
const readSongFacts = (): Map<string, SongFacts> => {
	const inputs = applyHandReviewedCorrections(
		JSON.parse(
			fs.readFileSync(path.join(DATA_DIRECTORY, "songs.json"), "utf8")
		) as SongInput[]
	);
	const facts = new Map<string, SongFacts>();
	for (const input of inputs) {
		const songKey = resolveSongKey(input);
		const song = facts.get(songKey) ?? {
			keyLabels: new Set<string>(),
			year: Infinity,
			popularity: 0
		};
		if (input.key && input.scale) {
			song.keyLabels.add(`${input.key} ${input.scale}`);
		}
		const year = Math.floor(Number(input.year));
		if (Number.isFinite(year)) song.year = Math.min(song.year, year);
		const popularity = Number(input.popularityScore);
		if (Number.isFinite(popularity)) {
			song.popularity = Math.max(song.popularity, popularity);
		}
		facts.set(songKey, song);
	}
	return facts;
};

const buildAllClusterIdeas = (): ClusterIdeasByMode => {
	const hexMap = JSON.parse(
		fs.readFileSync(path.join(DATA_DIRECTORY, "hexmap.json"), "utf8")
	) as HexMapSnapshot;
	const facts = readSongFacts();

	const candidatesByCluster = new Map<string, ClusterIdeaCandidate[]>(
		syncedSongClusters.map((cluster) => [cluster, []])
	);
	hexMap.songKeys.forEach((songKey, songIndex) => {
		const song = facts.get(songKey);
		// Songs whose sections disagree on the key can't anchor a same-key
		// group.
		if (!song || song.keyLabels.size !== 1 || !Number.isFinite(song.year)) {
			return;
		}
		const [keyLabel] = song.keyLabels;
		const coverage = hexMap.progressions[songIndex];
		for (let index = 0; index < coverage.length; index += 2) {
			const cluster = hexMap.progressionNames[coverage[index]];
			candidatesByCluster.get(cluster)?.push({
				songKey,
				title: hexMap.titles[songIndex],
				artists: hexMap.artists[songIndex],
				year: song.year,
				sharePercent: coverage[index + 1],
				popularity: song.popularity,
				keyLabel
			});
		}
	});

	const ideasFor = (
		spreadAcrossYears: boolean
	): Record<string, ClusterKeyIdea[]> =>
		Object.fromEntries(
			[...candidatesByCluster].map(([cluster, candidates]) => [
				cluster,
				buildClusterKeyIdeas(candidates, spreadAcrossYears)
			])
		);
	return { spread: ideasFor(true), strongest: ideasFor(false) };
};

// songs.json is ~50 MB, so build once per server process.
let cachedIdeas: ClusterIdeasByMode | null = null;

export const loadClusterIdeas = (): ClusterIdeasByMode =>
	(cachedIdeas ??= buildAllClusterIdeas());

import fs from "fs";
import path from "path";
import { applyHandReviewedCorrections } from "$data/applyHandReviewedCorrections.js";
import { resolveSongKey } from "../../../chord-processing/songIdentity.js";
import type { SongInput } from "../../../chord-processing/types.js";
import {
	buildClusterKeyIdeas,
	type ClusterIdeaCandidate,
	type ClusterIdeasByMode,
	type ClusterKeyIdea
} from "./clusterIdeas.js";
import { loadMapClusters, readHexMap } from "./mapClusters.server.js";

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
	const hexMap = readHexMap();
	const facts = readSongFacts();
	const mapClusters = loadMapClusters();

	const candidatesByCluster = new Map<string, ClusterIdeaCandidate[]>(
		mapClusters.map((cluster) => [cluster.name, []])
	);
	// A song is a candidate for every map cluster named for a progression
	// it has, at its biggest share of any of them.
	const clusterNamesByProgression = new Map<string, string[]>();
	for (const cluster of mapClusters) {
		for (const progressionName of cluster.progressionNames) {
			clusterNamesByProgression.set(progressionName, [
				...(clusterNamesByProgression.get(progressionName) ?? []),
				cluster.name
			]);
		}
	}
	hexMap.songKeys.forEach((songKey, songIndex) => {
		const song = facts.get(songKey);
		// Songs whose sections disagree on the key can't anchor a same-key
		// group.
		if (!song || song.keyLabels.size !== 1 || !Number.isFinite(song.year)) {
			return;
		}
		const [keyLabel] = song.keyLabels;
		const coverage = hexMap.progressions[songIndex];
		const shareByCluster = new Map<string, number>();
		for (let index = 0; index < coverage.length; index += 2) {
			const progressionName = hexMap.progressionNames[coverage[index]];
			const sharePercent = coverage[index + 1];
			for (const cluster of clusterNamesByProgression.get(progressionName) ??
				[]) {
				shareByCluster.set(
					cluster,
					Math.max(shareByCluster.get(cluster) ?? 0, sharePercent)
				);
			}
		}
		for (const [cluster, sharePercent] of shareByCluster) {
			candidatesByCluster.get(cluster)?.push({
				songKey,
				title: hexMap.titles[songIndex],
				artists: hexMap.artists[songIndex],
				year: song.year,
				sharePercent,
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

// songs.json is ~50 MB, so build once per map: again only when hexmap.json
// changes (its clusters are what the ideas are grouped by).
let cachedIdeas: { hexMap: object; ideas: ClusterIdeasByMode } | null = null;

export const loadClusterIdeas = (): ClusterIdeasByMode => {
	const hexMap = readHexMap();
	if (cachedIdeas?.hexMap !== hexMap) {
		cachedIdeas = { hexMap, ideas: buildAllClusterIdeas() };
	}
	return cachedIdeas.ideas;
};

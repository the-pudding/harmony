import type { ProgressionGroup } from "./core-progressions.js";
import { chordProgressionVariants } from "./core-progressions.js";

export type GroupNode = {
	type: "group";
	id: string;
	label: string;
	description: string;
};

export type ProgressionNode = {
	type: "progression";
	id: string;
	label: string;
	chordProgression: string;
	scale: string;
};

export type SongNode = {
	type: "song";
	id: string;
	label: string;
	songKey: string;
	artists: string[];
};

export type NetworkNode = GroupNode | ProgressionNode | SongNode;

export type GroupProgressionLink = {
	type: "group-progression";
	source: string;
	target: string;
};

export type SongProgressionLink = {
	type: "song-progression";
	source: string;
	target: string;
};

export type NetworkLink = GroupProgressionLink | SongProgressionLink;

export type ProgressionNetworkData = {
	nodes: NetworkNode[];
	links: NetworkLink[];
};

export type SongNetworkInput = {
	songKey: string;
	title: string;
	artists: string[];
	matchingProgressions: string[];
};

const groupNodeId = (groupName: string): string => `group:${groupName}`;
const progressionNodeId = (chordProgression: string): string =>
	`progression:${chordProgression}`;
const songNodeId = (songKey: string): string => `song:${songKey}`;

export const buildProgressionNetwork = (
	groups: ProgressionGroup[],
	songs: SongNetworkInput[]
): ProgressionNetworkData => {
	const nodes: NetworkNode[] = [];
	const links: NetworkLink[] = [];

	const knownProgressionIds = new Set<string>();

	for (const group of groups) {
		const groupId = groupNodeId(group.name);
		nodes.push({
			type: "group",
			id: groupId,
			label: group.name,
			description: group.description
		});

		for (const progression of group.progressions) {
			for (const variant of chordProgressionVariants(
				progression.chordProgression
			)) {
				const progressionId = progressionNodeId(variant);

				if (!knownProgressionIds.has(progressionId)) {
					knownProgressionIds.add(progressionId);
					nodes.push({
						type: "progression",
						id: progressionId,
						label: progression.name,
						chordProgression: variant,
						scale: progression.scale
					});
				}

				links.push({
					type: "group-progression",
					source: groupId,
					target: progressionId
				});
			}
		}
	}

	for (const song of songs) {
		const songId = songNodeId(song.songKey);
		nodes.push({
			type: "song",
			id: songId,
			label: song.title,
			songKey: song.songKey,
			artists: song.artists
		});

		for (const chordProgression of song.matchingProgressions) {
			const progressionId = progressionNodeId(chordProgression);
			if (!knownProgressionIds.has(progressionId)) continue;

			links.push({
				type: "song-progression",
				source: songId,
				target: progressionId
			});
		}
	}

	return { nodes, links };
};

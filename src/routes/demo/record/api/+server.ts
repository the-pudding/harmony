import fs from "fs";
import path from "path";
import { json } from "@sveltejs/kit";
import { csvFormat, csvParse } from "d3-dsv";
import {
	isSyncedSongFile,
	isSyncedVideoId,
	SYNCED_SONG_DATA_DIRECTORY,
	SYNCED_VIDEO_DATA_DIRECTORY,
	SYNCED_SONG_REFERENCE_FILE,
	syncedSongClusters,
	type SyncedSongReferenceRow
} from "$data/syncedSongs.js";
import {
	parseReferenceRows,
	REFERENCE_COLUMNS,
	reorderClusterRows,
	upsertReferenceRow,
	type FeaturedSongSetting
} from "$data/syncedSongReference.js";
import { formatJsonLikeRepo } from "../formatJsonLikeRepo.js";
import type { RequestHandler } from "./$types.js";

// Dev-only: writes src/data/synced-songs/{songKey}.json, and the song's
// cluster row in src/data/synced-songs/reference.csv (or, given a videoId,
// just src/data/synced-videos/{videoId}.json), with plain node:fs,
// which only works when a real Node process is serving requests
// (`npm run dev`). The static build drops this route.
export const prerender = false;

const DATA_DIRECTORY = path.join(process.cwd(), SYNCED_SONG_DATA_DIRECTORY);
const VIDEO_DATA_DIRECTORY = path.join(
	process.cwd(),
	SYNCED_VIDEO_DATA_DIRECTORY
);
const REFERENCE_PATH = path.join(DATA_DIRECTORY, SYNCED_SONG_REFERENCE_FILE);

const readReferenceRows = (): SyncedSongReferenceRow[] =>
	fs.existsSync(REFERENCE_PATH)
		? parseReferenceRows(csvParse(fs.readFileSync(REFERENCE_PATH, "utf8")))
		: [];

const writeReferenceRows = (rows: SyncedSongReferenceRow[]) =>
	fs.writeFileSync(
		REFERENCE_PATH,
		`${csvFormat(rows, REFERENCE_COLUMNS)}\n`
	);

export const POST: RequestHandler = async ({ request }) => {
	const body: unknown = await request.json();
	const { file, cluster, videoId } = (body ?? {}) as {
		file?: unknown;
		cluster?: unknown;
		videoId?: unknown;
	};
	if (!isSyncedSongFile(file)) {
		return json({ error: "not a synced song file" }, { status: 400 });
	}
	if (videoId !== undefined) {
		if (!isSyncedVideoId(videoId)) {
			return json({ error: "unknown video" }, { status: 400 });
		}
		const videoFilePath = path.join(VIDEO_DATA_DIRECTORY, `${videoId}.json`);
		fs.mkdirSync(VIDEO_DATA_DIRECTORY, { recursive: true });
		fs.writeFileSync(videoFilePath, await formatJsonLikeRepo(file));
		return json({ path: path.relative(process.cwd(), videoFilePath) });
	}
	if (typeof cluster !== "string" || !syncedSongClusters.includes(cluster)) {
		return json({ error: "unknown cluster" }, { status: 400 });
	}

	const filePath = path.join(DATA_DIRECTORY, `${file.songKey}.json`);
	if (path.dirname(filePath) !== DATA_DIRECTORY) {
		return json({ error: "invalid song key" }, { status: 400 });
	}

	fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
	fs.writeFileSync(filePath, await formatJsonLikeRepo(file));
	writeReferenceRows(
		upsertReferenceRow(readReferenceRows(), {
			cluster,
			songKey: file.songKey,
			...file.region
		})
	);
	return json({ path: path.relative(process.cwd(), filePath) });
};

const isFeaturedSongSettings = (
	value: unknown
): value is FeaturedSongSetting[] =>
	Array.isArray(value) &&
	value.every(
		(song) =>
			typeof song?.songKey === "string" && typeof song?.visible === "boolean"
	);

// Sets one cluster's play order and which of its songs are visible, in
// reference.csv.
export const PUT: RequestHandler = async ({ request }) => {
	const body: unknown = await request.json();
	const { cluster, songs } = (body ?? {}) as {
		cluster?: unknown;
		songs?: unknown;
	};
	if (typeof cluster !== "string" || !isFeaturedSongSettings(songs)) {
		return json({ error: "expected a cluster and its songs" }, { status: 400 });
	}
	const nextRows = reorderClusterRows(readReferenceRows(), cluster, songs);
	if (!nextRows) {
		return json(
			{ error: "reference.csv changed; reload and try again" },
			{ status: 409 }
		);
	}
	writeReferenceRows(nextRows);
	return json({ ok: true });
};

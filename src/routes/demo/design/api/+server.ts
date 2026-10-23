import fs from "fs";
import path from "path";
import { json } from "@sveltejs/kit";
import { csvFormat, csvParse } from "d3-dsv";
import {
	isSyncedSongFile,
	SYNCED_SONG_DATA_DIRECTORY,
	SYNCED_SONG_REFERENCE_FILE,
	syncedSongClusters,
	type SyncedSongReferenceRow
} from "$data/syncedSongs.js";
import { formatJsonLikeRepo } from "../formatJsonLikeRepo.js";
import type { RequestHandler } from "./$types.js";

// Dev-only: writes src/data/synced-songs/{songKey}.json, and the song's
// cluster row in src/data/synced-songs/reference.csv, with plain node:fs,
// which only works when a real Node process is serving requests
// (`npm run dev`). The static build drops this route.
export const prerender = false;

const DATA_DIRECTORY = path.join(process.cwd(), SYNCED_SONG_DATA_DIRECTORY);
const REFERENCE_PATH = path.join(DATA_DIRECTORY, SYNCED_SONG_REFERENCE_FILE);

// Replaces the song's row, or adds one, keeping rows sorted by cluster and
// then song key so the file diffs cleanly.
const writeReferenceRow = (row: SyncedSongReferenceRow) => {
	const rows: SyncedSongReferenceRow[] = fs.existsSync(REFERENCE_PATH)
		? csvParse(fs.readFileSync(REFERENCE_PATH, "utf8")).map((d) => ({
				cluster: d.cluster ?? "",
				songKey: d.songKey ?? "",
				startSeconds: Number(d.startSeconds),
				endSeconds: Number(d.endSeconds)
			}))
		: [];
	const nextRows = [
		...rows.filter((other) => other.songKey !== row.songKey),
		row
	].sort(
		(a, b) =>
			a.cluster.localeCompare(b.cluster) || a.songKey.localeCompare(b.songKey)
	);
	fs.writeFileSync(
		REFERENCE_PATH,
		`${csvFormat(nextRows, ["cluster", "songKey", "startSeconds", "endSeconds"])}\n`
	);
};

export const POST: RequestHandler = async ({ request }) => {
	const body: unknown = await request.json();
	const { file, cluster } = (body ?? {}) as {
		file?: unknown;
		cluster?: unknown;
	};
	if (!isSyncedSongFile(file)) {
		return json({ error: "not a synced song file" }, { status: 400 });
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
	writeReferenceRow({
		cluster,
		songKey: file.songKey,
		...file.region
	});
	return json({ path: path.relative(process.cwd(), filePath) });
};

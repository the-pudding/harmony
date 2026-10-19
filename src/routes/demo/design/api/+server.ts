import fs from "fs";
import path from "path";
import { json } from "@sveltejs/kit";
import {
	isSyncedSongFile,
	SYNCED_SONG_DATA_DIRECTORY
} from "$data/syncedSongs.js";
import { formatJsonLikeRepo } from "../formatJsonLikeRepo.js";
import type { RequestHandler } from "./$types.js";

// Dev-only: writes src/data/synced-songs/{songKey}.json with plain node:fs,
// which only works when a real Node process is serving requests
// (`npm run dev`). The static build drops this route.
export const prerender = false;

const DATA_DIRECTORY = path.join(process.cwd(), SYNCED_SONG_DATA_DIRECTORY);

export const POST: RequestHandler = async ({ request }) => {
	const file: unknown = await request.json();
	if (!isSyncedSongFile(file)) {
		return json({ error: "not a synced song file" }, { status: 400 });
	}

	const filePath = path.join(DATA_DIRECTORY, `${file.songKey}.json`);
	if (path.dirname(filePath) !== DATA_DIRECTORY) {
		return json({ error: "invalid song key" }, { status: 400 });
	}

	fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
	fs.writeFileSync(filePath, await formatJsonLikeRepo(file));
	return json({ path: path.relative(process.cwd(), filePath) });
};

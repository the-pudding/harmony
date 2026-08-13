import { onMount } from "svelte";
import type { GroupedSong } from "../../../data/songBrowser.js";
import { fetchBillboardTop10Songs } from "./fetchBillboardTop10Songs.js";

export const createBillboardTop10State = () => {
	let groupedSongs = $state<GroupedSong[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(() => {
		fetchBillboardTop10Songs()
			.then((songs) => {
				groupedSongs = songs;
			})
			.catch((err) => {
				error = err instanceof Error ? err.message : "Failed to load songs";
			})
			.finally(() => {
				loading = false;
			});
	});

	return {
		get groupedSongs() {
			return groupedSongs;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		}
	};
};

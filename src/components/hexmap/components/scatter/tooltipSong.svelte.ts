import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { SongSummary } from "./paint/outlinedLabels.js";

// The song a tooltip shows: from songByKey, or else fetched with loadSong,
// plus its summary for naming it while that loads.
export const createTooltipSong = (input: {
	readonly songKey: string | null;
	readonly songByKey: Map<string, GroupedSong>;
	readonly loadSong: ((songKey: string) => Promise<GroupedSong | null>) | null;
	readonly summaries: ReadonlyMap<string, SongSummary> | null;
}) => {
	let loadedSong = $state.raw<GroupedSong | null>(null);

	$effect(() => {
		const songKey = input.songKey;
		const { loadSong } = input;
		if (songKey === null || !loadSong || input.songByKey.has(songKey)) return;
		let active = true;
		void loadSong(songKey)
			.then((song) => {
				if (active) loadedSong = song;
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	});

	const song = $derived.by(() => {
		const songKey = input.songKey;
		if (songKey === null) return null;
		return (
			input.songByKey.get(songKey) ??
			(loadedSong?.songKey === songKey ? loadedSong : null)
		);
	});

	const summary = $derived(
		input.songKey === null
			? null
			: (input.summaries?.get(input.songKey) ?? null)
	);

	return {
		get song() {
			return song;
		},
		get summary() {
			return summary;
		}
	};
};

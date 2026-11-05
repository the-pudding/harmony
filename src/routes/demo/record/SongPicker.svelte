<script lang="ts">
	import type { SyncedSongAudio } from "$data/syncedSongs.js";
	import LabeledSelect from "./LabeledSelect.svelte";

	type Props = {
		options: SyncedSongAudio[];
		songKey: string | undefined;
		labelOf: (option: SyncedSongAudio) => string;
		onSelect: (songKey: string) => void;
	};

	let { options, songKey, labelOf, onSelect }: Props = $props();
</script>

<LabeledSelect
	label="Song"
	options={options.map((option) => ({
		value: option.songKey,
		label: labelOf(option)
	}))}
	value={songKey}
	{onSelect}
/>

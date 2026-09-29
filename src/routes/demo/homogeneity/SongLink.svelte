<script lang="ts">
	import { buildDefineChordProgressionSongUrl } from "../shared/defineChordProgressionSongUrl.js";

	type Props = {
		songKey: string;
		title: string;
		artists: string[];
		emphasized?: boolean;
	};

	const { songKey, title, artists, emphasized = false }: Props = $props();
</script>

<a
	class="song-link"
	class:song-link-emphasized={emphasized}
	href={buildDefineChordProgressionSongUrl(songKey)}
	target="_blank"
	rel="noopener noreferrer">{title}</a
>
<span class="song-artists">— {artists.join(", ")}</span>

<style>
	.song-link {
		color: #e4e4e7;
		text-decoration: none;
	}

	.song-link:hover {
		text-decoration: underline;
	}

	.song-link-emphasized {
		font-weight: 600;
		color: #f4f4f5;
	}

	.song-artists {
		color: #71717a;
	}
</style>

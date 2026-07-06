<script lang="ts">
	import type { Note } from "../chord-processing/types.js";

	let { note }: { note: Note } = $props();
</script>

<span class="note">
	<span class="name">{note.noteName}</span><sub class="octave"
		>{note.octave}</sub
	>
</span>

<style>
	.note .name {
		color: #fff;
	}

	.octave {
		font-size: 0.72em;
		color: #71717a;
		vertical-align: baseline;
	}
</style>

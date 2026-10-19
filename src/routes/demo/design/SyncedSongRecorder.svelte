<script lang="ts">
	import {
		committedSyncedSongs,
		SYNCED_SONG_AUDIO_DIRECTORY,
		SYNCED_SONG_DATA_DIRECTORY,
		type SyncedSongAudio,
		type SyncedSongFile
	} from "$data/syncedSongs.js";
	import SongPicker from "./SongPicker.svelte";
	import SyncedSongPlayer from "./SyncedSongPlayer.svelte";
	import { songKeyLabel } from "./designSongs.js";
	import { createSongSelection } from "./songSelection.svelte.js";

	type Props = {
		audioOptions: SyncedSongAudio[];
	};

	let { audioOptions }: Props = $props();

	const selection = createSongSelection(() => audioOptions);
	// Saved this session, before the data module reloads with them.
	let savedFiles = $state.raw<Record<string, SyncedSongFile>>({});

	const committedFileOf = (songKey: string): SyncedSongFile | undefined =>
		savedFiles[songKey] ?? committedSyncedSongs[songKey];

	const optionLabel = (option: SyncedSongAudio): string =>
		`${songKeyLabel(option.songKey)}${committedFileOf(option.songKey) ? " · saved" : ""}`;
</script>

<div class="recorder">
	<div class="how-to">
		<p class="how-to-heading">How to record a synced song</p>
		<ol>
			<li>
				Pick a song. Its audio comes from
				<code
					>static/{SYNCED_SONG_AUDIO_DIRECTORY}/{"{artist}__{song}"}.mp3</code
				>
				(or <code>.mp4</code>).
			</li>
			<li>
				Check the <strong>key</strong>. It starts as the corpus's key for the
				song, and every roman numeral is counted from it.
			</li>
			<li>
				Set the <strong>region</strong>, the part of the audio that has chord
				data. Drag the yellow handles on the waveform, or play to a spot and use
				<em>start at playhead</em> / <em>end at playhead</em>. The last chord
				lasts until the region ends.
			</li>
			<li>
				Connect a MIDI keyboard, press <strong>record</strong>, and play along:
				each chord you play is saved with its time, name and numeral. Play the
				full chord, or just its bass note to get the chord that belongs on that
				note in the key (F# in A major is F#m). Playing the same chord again
				records it again, so repeats show up. Recording replaces any chords the
				playhead passes over, so you can redo a passage.
			</li>
			<li>
				To fix a chord, drag it, or focus it and press ← → to nudge it (hold
				shift for bigger steps) or Delete to remove it. Space plays and pauses,
				and ⌘Z undoes.
			</li>
			<li>
				<strong>Save</strong> writes
				<code>{SYNCED_SONG_DATA_DIRECTORY}/{"{song key}"}.json</code>. This only
				works under <code>npm run dev</code>. Until you save, edits stay in this
				browser.
			</li>
		</ol>
	</div>

	{#if audioOptions.length === 0}
		<p class="message">
			No audio yet. Add <code>{"{artist}__{song}"}.mp3</code> files to
			<code>static/{SYNCED_SONG_AUDIO_DIRECTORY}/</code> and reload.
		</p>
	{:else}
		<SongPicker
			options={audioOptions}
			songKey={selection.selectedSongKey}
			labelOf={optionLabel}
			onSelect={selection.select}
		/>

		{#if selection.loadError}
			<p class="message error">{selection.loadError}</p>
		{:else if selection.song}
			{#key selection.song.songKey}
				<SyncedSongPlayer
					song={selection.song}
					committedFile={committedFileOf(selection.song.songKey)}
					onSaved={(file) =>
						(savedFiles = { ...savedFiles, [file.songKey]: file })}
					editing
				/>
			{/key}
		{:else}
			<p class="message">Loading chords…</p>
		{/if}
	{/if}
</div>

<style>
	.recorder {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.how-to {
		max-width: 48rem;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.75rem;
		line-height: 1.6;
		color: #a1a1aa;
	}

	.how-to-heading {
		margin: 0 0 0.375rem;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	ol {
		margin: 0;
		padding-left: 1.25rem;
	}

	strong,
	em {
		color: #f4f4f5;
	}

	code {
		color: #d4d4d8;
	}

	.message {
		margin: 0;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.message.error {
		color: #fca5a5;
	}
</style>

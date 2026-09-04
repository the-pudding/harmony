<script lang="ts">
  import type { TrickySongToMatchCorrectly } from "../../../../data/hand-reviewed-songs.js";

  type Props = {
    trickySongs: TrickySongToMatchCorrectly[];
    selectedKey: string;
    onselect: (songKey: string) => void;
  };

  const { trickySongs, selectedKey, onselect }: Props = $props();

  const formatId = (id: string) =>
    id.replace("__", " — ").replace(/-/g, " ");
</script>

<ul class="songs">
  {#each trickySongs as song (song.id)}
    <li>
      <button
        class="song-btn"
        class:active={selectedKey === song.id}
        onclick={() => onselect(song.id)}
        type="button"
      >
        <span class="song-title">{formatId(song.id)}</span>
        <span class="song-challenge">{song.chordMatchingChallenges}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .songs {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .song-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    background: transparent;
    border: 1px solid #27272a;
    border-radius: 0.375rem;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }

  .song-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: #3f3f46;
  }

  .song-btn.active {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.4);
  }

  .song-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: #e4e4e7;
    text-transform: capitalize;
  }

  .song-challenge {
    font-size: 0.7rem;
    color: #a1a1aa;
    line-height: 1.4;
  }
</style>

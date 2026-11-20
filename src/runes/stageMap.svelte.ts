import { untrack } from "svelte";
import type { MapScene } from "$components/storymap/mapScene.js";

// What the slide's stage component tells the map under it, beyond the
// slide's `{.map}` block (Signatures picks the chart's progression and plays
// its decade's songs on their dots). A stage opens it while mounted and only
// its own close clears it, so an outgoing stage fading out can't wipe the
// incoming one's. Each field is its own state, so the playing song's
// per-frame progress doesn't rebuild the map's scene.

type Fields = {
	// The chart a chart layout features; null leaves the slide's own.
	chart: MapScene["chart"] | null;
	// The stage's own songs: playable on the map, played by the stage.
	songKeys: readonly string[];
	// Called when one of songKeys' dots is clicked, or with null to stop.
	onSongClick: ((songKey: string | null) => void) | null;
	playingSongKey: string | null;
	// 0–1 through the playing song's clip.
	progressFraction: number;
	// Px from the stage's top that its own content covers; the map's frame
	// starts below it. 0 = none.
	frameTop: number;
};

const EMPTY: Fields = {
	chart: null,
	songKeys: [],
	onSongClick: null,
	playingSongKey: null,
	progressFraction: 0,
	frameTop: 0
};

class StageMap implements Fields {
	chart = $state.raw(EMPTY.chart);
	songKeys = $state.raw(EMPTY.songKeys);
	onSongClick = $state.raw(EMPTY.onSongClick);
	playingSongKey = $state.raw(EMPTY.playingSongKey);
	progressFraction = $state.raw(EMPTY.progressFraction);
	frameTop = $state.raw(EMPTY.frameTop);

	#owner: object | null = null;

	// Writes only what changed, so readers re-run only on real differences;
	// untracked, so an effect that publishes doesn't re-run on its own write.
	#assign(next: Partial<Fields>) {
		untrack(() => {
			const fields = this as unknown as Record<string, unknown>;
			for (const [key, value] of Object.entries(next)) {
				if (fields[key] !== value) fields[key] = value;
			}
		});
	}

	open(owner: object) {
		this.#owner = owner;
		this.#assign(EMPTY);
	}

	update(owner: object, next: Partial<Fields>) {
		if (owner === this.#owner) this.#assign(next);
	}

	close(owner: object) {
		if (owner !== this.#owner) return;
		this.#owner = null;
		this.#assign(EMPTY);
	}
}

export const stageMap = new StageMap();

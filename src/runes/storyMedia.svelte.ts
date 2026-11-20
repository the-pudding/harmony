import { untrack } from "svelte";

// What the story's video is showing, shared with the map: which video is
// playing and which of its cues is current (-1: none), plus how far below
// the top of the stage the stage video's bottom edge is (0: none), so the
// map's frame can start below it. Each setter writes only on change, so
// readers re-run only when something differs.

let videoId = $state<string | null>(null);
let cueIndex = $state(-1);
let videoBottomOffset = $state(0);

export const storyMedia = {
	get videoId() {
		return videoId;
	},
	get cueIndex() {
		return cueIndex;
	},
	get videoBottomOffset() {
		return videoBottomOffset;
	},
	setCue(nextVideoId: string, nextCueIndex: number) {
		if (videoId !== nextVideoId) videoId = nextVideoId;
		if (cueIndex !== nextCueIndex) cueIndex = nextCueIndex;
	},
	clearCue() {
		if (videoId !== null) videoId = null;
		if (cueIndex !== -1) cueIndex = -1;
	},
	setVideoBottomOffset(bottom: number) {
		const rounded = Math.round(bottom);
		// untracked: effects that publish must not re-run on their own write
		if (untrack(() => videoBottomOffset) !== rounded)
			videoBottomOffset = rounded;
	}
};

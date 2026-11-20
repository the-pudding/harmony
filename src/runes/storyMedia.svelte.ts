import { untrack } from "svelte";

// Video state shared with the map: cueIndex -1 = none; videoBottomOffset is
// px below the stage top, 0 = none. Setters write only on change so readers
// re-run only on real differences.

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

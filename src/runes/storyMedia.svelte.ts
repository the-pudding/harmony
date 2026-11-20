// What the story's video is showing, shared with the map: which video is
// playing and which of its cues is current (-1: none), plus how tall the
// docked video card is so the map can leave room under it. Each setter
// writes only on change, so readers re-run only when something differs.

let videoId = $state<string | null>(null);
let cueIndex = $state(-1);
let dockHeight = $state(0);

export const storyMedia = {
	get videoId() {
		return videoId;
	},
	get cueIndex() {
		return cueIndex;
	},
	get dockHeight() {
		return dockHeight;
	},
	setCue(nextVideoId: string, nextCueIndex: number) {
		if (videoId !== nextVideoId) videoId = nextVideoId;
		if (cueIndex !== nextCueIndex) cueIndex = nextCueIndex;
	},
	clearCue() {
		if (videoId !== null) videoId = null;
		if (cueIndex !== -1) cueIndex = -1;
	},
	setDockHeight(height: number) {
		if (dockHeight !== height) dockHeight = height;
	}
};

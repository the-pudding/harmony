// Types for copy.json, the hand-edited source of truth for the story text.
// Values are only strings, lists and objects (booleans are strings);
// storymap/mapScene.ts types `map`.
declare module "$data/copy.json" {
	// A list, or one comma-separated string.
	export type CopyList = string | string[];

	// A slide's `{.map}` block: what the map behind the text should be.
	// Booleans are the strings "true" / "false".
	export type CopyMap = {
		// "true" shows the map on the slide.
		visible?: string;
		// The arrangement: "umap" (the default), "timeline", "sky" (the
		// drifting night sky; fills the screen by default), or section 3's
		// charts of songs by effective progressions, "effectiveProgressions"
		// (one bar) and "effectiveProgressionsByDecade" (a bar per decade),
		// or section 4's "progressionOverTime" (a 100% stack of each year's
		// songs, the featured progression's at the bottom; the Signatures
		// stage picks the progression and the decade it highlights).
		layout?: string;
		// "text" (default) sits below the story text; "full" fills the screen.
		frame?: string;
		// Zoom in on this cluster (by name), or on this one song (by key).
		focusCluster?: string;
		focusSong?: string;
		centered?: string;
		// Everyone else fades out.
		onlySongs?: CopyList;
		// Drawn enlarged and labeled, but not playable.
		highlightSongs?: CopyList;
		// Enlarged, labeled, with a 🎧, and clickable to play.
		playableSongs?: CopyList;
		// Everything not highlighted is drawn faint.
		dimmed?: string;
		// "true" on the sky: spotlights its big hits and the piece's example
		// songs, one after another (see skySongs.ts).
		cycleSongs?: string;
		// A video's id (see videoCues.ts): the map follows it as it plays.
		followVideo?: string;
		// A video's id whose songs start out already lit.
		litVideoSongs?: string;
		hideLabels?: string;
		// Only label these clusters (comma-separated names).
		showLabels?: string;
		rotateLabels?: string;
		movable?: string;
		hoverable?: string;
		// "full" (default), "basic" (title, year, artist and the bar of
		// progressions, without the summary or click hint), or "label"
		// (title, year and artist only).
		tooltip?: string;
		hidePlayer?: string;
		// Song keys: arriving from another layout, these move first,
		// together, before revealClusters (e.g. songs the previous slide's
		// stage anchored, so they land before everyone else fills in).
		revealSongs?: CopyList;
		// Cluster names (exact): arriving from another layout (or from a
		// slide without a map), each one's songs move in turn, in this
		// order, then everyone else; the slide's stage waits until they're in.
		// Not when going back.
		revealClusters?: CopyList;
	};

	// A slide's `{.stage}` block: a component and its props, all text or
	// lists of text (e.g. `songs`, `keys`).
	export type CopyStage = {
		component?: string;
		hed?: string;
		byline?: string;
		videoId?: string;
		[prop: string]: string | string[] | undefined;
	};

	export type CopyTextBlock =
		| { type: "text"; value: string }
		| { type: string; value: Record<string, unknown> };

	export type CopySlide = {
		text: CopyTextBlock[];
		// Without one, the map keeps only the songs its stage anchors.
		map?: CopyMap;
		stage?: CopyStage;
		overlay?: CopyStage;
	};

	export type CopySection = { title?: string; slides: CopySlide[] };

	const copy: {
		meta: { title: string; description: string };
		sections: CopySection[];
	};
	export default copy;
}

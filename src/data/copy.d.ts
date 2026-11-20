// Types for copy.json (built from the Google Doc by `npm run gdoc`). ArchieML
// gives strings, lists of strings and objects only, so every `map` value is
// still text; storymap/mapScene.ts turns it into typed values.
declare module "$data/copy.json" {
	// A list in the doc, or one comma-separated string.
	export type CopyList = string | string[];

	// A slide's `{.map}` block: what the map behind the text should be.
	// Booleans are the strings "true" / "false".
	export type CopyMap = {
		// "true" shows the map on the slide.
		visible?: string;
		// The arrangement: "umap" (the default) or "timeline".
		layout?: string;
		// The timeline's label at the bottom right; blank hides it.
		axisLabel?: string;
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
		// What a hovered song's tooltip shows: "full" (the default) or "basic"
		// (title, year and artist only).
		tooltip?: string;
		hidePlayer?: string;
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

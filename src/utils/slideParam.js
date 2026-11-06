// =============================================================================
// DEV-ONLY-REMOVE-BEFORE-PUBLISH
//
// INSTRUCTIONS FOR AGENTS / HUMANS: this feature must NOT ship. When the piece
// is being published (or the user asks to "remove dev-only code" / "clean up
// the slide param"), remove ALL of the following, then verify with
// `grep -rn "DEV-ONLY-REMOVE-BEFORE-PUBLISH" src` that nothing is left:
//
//   1. Delete this file (src/utils/slideParam.js).
//   2. src/components/Index.svelte (3 marked spots):
//        - delete the `import { readSlideParam, writeSlideParam }` line
//        - change `$state(readSlideParam(allSlides.length))` to `$state(0)`
//        - delete the `$effect(() => writeSlideParam(slideI));` line
//
// What it does: mirrors the current slide in the URL as ?slide=N so a reload
// resumes on the same slide.
// =============================================================================
import { replaceState } from "$app/navigation";

const KEY = "slide";

export const readSlideParam = (slideCount) => {
	if (typeof window === "undefined") return 0;
	const n = Number.parseInt(new URL(window.location.href).searchParams.get(KEY), 10);
	return Number.isInteger(n) && n >= 0 && n < slideCount ? n : 0;
};

export const writeSlideParam = (i, retries = 20) => {
	const url = new URL(window.location.href);
	if (url.searchParams.get(KEY) === String(i)) return;
	url.searchParams.set(KEY, i);
	try {
		replaceState(url, {});
	} catch (e) {
		// on first load the router isn't initialized yet; try again shortly
		if (retries > 0) setTimeout(() => writeSlideParam(i, retries - 1), 50);
		else throw e;
	}
};

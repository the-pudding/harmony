// =============================================================================
// DEV-ONLY-REMOVE-BEFORE-PUBLISH
//
// INSTRUCTIONS FOR AGENTS / HUMANS: this feature must NOT ship. When the piece
// is being published (or the user asks to "remove dev-only code" / "clean up
// the muted param"), remove ALL of the following, then verify with
// `grep -rn "DEV-ONLY-REMOVE-BEFORE-PUBLISH" src` that nothing is left:
//
//   1. Delete this file (src/utils/mutedParam.js).
//   2. src/components/Index.svelte (3 marked spots, labeled "muted"):
//        - delete the `import { readMutedParam, writeMutedParam }` line
//        - delete the `const initialMuted = readMutedParam(); ...` lines
//        - delete the `$effect(() => writeMutedParam(audio.muted));` line
//
// What it does: mirrors the mute toggle in the URL as ?muted=true|false so a
// reload keeps the setting. With no param, the default (muted) applies.
// =============================================================================
import { replaceState } from "$app/navigation";

const KEY = "muted";

// true / false, or undefined when absent or invalid
export const readMutedParam = () => {
	if (typeof window === "undefined") return undefined;
	const value = new URL(window.location.href).searchParams.get(KEY);
	return value === "true" ? true : value === "false" ? false : undefined;
};

export const writeMutedParam = (muted, retries = 20) => {
	const url = new URL(window.location.href);
	if (url.searchParams.get(KEY) === String(muted)) return;
	url.searchParams.set(KEY, muted);
	try {
		replaceState(url, {});
	} catch (e) {
		// on first load the router isn't initialized yet; try again shortly
		if (retries > 0) setTimeout(() => writeMutedParam(muted, retries - 1), 50);
		else throw e;
	}
};

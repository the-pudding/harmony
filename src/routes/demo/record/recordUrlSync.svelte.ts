import debounce from "lodash.debounce";
import {
	replacePlayheadInUrl,
	replaceZoomInUrl,
	type RecordUrlState
} from "./recordUrlState.js";

const PLAYHEAD_URL_SETTLE_MS = 1000;

export const syncRecordUrlState = (getState: () => RecordUrlState) => {
	const replacePlayheadWhenSettled = debounce(
		replacePlayheadInUrl,
		PLAYHEAD_URL_SETTLE_MS
	);

	$effect(() => replaceZoomInUrl(getState().zoom));

	$effect(() => {
		replacePlayheadWhenSettled(getState().playheadSeconds);
		return () => replacePlayheadWhenSettled.cancel();
	});
};

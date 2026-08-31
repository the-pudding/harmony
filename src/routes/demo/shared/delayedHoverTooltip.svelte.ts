import type { HoverCardAnchor } from "./hoverCardPosition.js";

export const createDelayedHoverTooltip = () => {
	let pendingSongKey = $state<string | null>(null);
	let pendingAnchor = $state<HoverCardAnchor | null>(null);
	let tooltipSongKey = $state<string | null>(null);
	let tooltipAnchor = $state<HoverCardAnchor | null>(null);
	let isDragging = $state(false);

	const syncTooltipVisibility = () => {
		if (pendingSongKey === null || pendingAnchor === null || isDragging) {
			tooltipSongKey = null;
			tooltipAnchor = null;
			return;
		}
		tooltipSongKey = pendingSongKey;
		tooltipAnchor = pendingAnchor;
	};

	const setHover = (songKey: string | null, anchor: HoverCardAnchor | null) => {
		pendingSongKey = songKey;
		pendingAnchor = anchor;
		syncTooltipVisibility();
	};

	const clearHover = () => {
		pendingSongKey = null;
		pendingAnchor = null;
		syncTooltipVisibility();
	};

	const startDrag = () => {
		isDragging = true;
		syncTooltipVisibility();
	};

	const endDrag = () => {
		isDragging = false;
		syncTooltipVisibility();
	};

	const dispose = () => {};

	return {
		get tooltipSongKey() {
			return tooltipSongKey;
		},
		get tooltipAnchor() {
			return tooltipAnchor;
		},
		setHover,
		clearHover,
		startDrag,
		endDrag,
		dispose
	};
};

export type DelayedHoverTooltip = ReturnType<typeof createDelayedHoverTooltip>;

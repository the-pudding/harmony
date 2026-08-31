import type { HoverCardAnchor } from "./hoverCardPosition.js";

export const TOOLTIP_CONTENT_EXPAND_DELAY_MS = 500;

export const createDelayedHoverTooltip = () => {
	let pendingSongKey = $state<string | null>(null);
	let pendingAnchor = $state<HoverCardAnchor | null>(null);
	let tooltipSongKey = $state<string | null>(null);
	let tooltipAnchor = $state<HoverCardAnchor | null>(null);
	let tooltipExpanded = $state(false);
	let isDragging = $state(false);
	let expandTimeoutId: ReturnType<typeof setTimeout> | null = null;

	const clearExpandTimeout = () => {
		if (expandTimeoutId === null) return;
		clearTimeout(expandTimeoutId);
		expandTimeoutId = null;
	};

	const syncTooltipVisibility = () => {
		if (pendingSongKey === null || pendingAnchor === null || isDragging) {
			tooltipSongKey = null;
			tooltipAnchor = null;
			return;
		}
		tooltipSongKey = pendingSongKey;
		tooltipAnchor = pendingAnchor;
	};

	const scheduleExpand = () => {
		clearExpandTimeout();
		tooltipExpanded = false;
		if (pendingSongKey === null || pendingAnchor === null || isDragging) return;
		expandTimeoutId = setTimeout(() => {
			if (pendingSongKey === null || pendingAnchor === null || isDragging) return;
			tooltipExpanded = true;
		}, TOOLTIP_CONTENT_EXPAND_DELAY_MS);
	};

	const setHover = (songKey: string | null, anchor: HoverCardAnchor | null) => {
		pendingSongKey = songKey;
		pendingAnchor = anchor;
		syncTooltipVisibility();
		scheduleExpand();
	};

	const clearHover = () => {
		pendingSongKey = null;
		pendingAnchor = null;
		tooltipExpanded = false;
		clearExpandTimeout();
		syncTooltipVisibility();
	};

	const startDrag = () => {
		isDragging = true;
		tooltipExpanded = false;
		clearExpandTimeout();
		syncTooltipVisibility();
	};

	const endDrag = () => {
		isDragging = false;
		syncTooltipVisibility();
		scheduleExpand();
	};

	const dispose = () => {
		clearExpandTimeout();
	};

	return {
		get tooltipSongKey() {
			return tooltipSongKey;
		},
		get tooltipAnchor() {
			return tooltipAnchor;
		},
		get tooltipExpanded() {
			return tooltipExpanded;
		},
		setHover,
		clearHover,
		startDrag,
		endDrag,
		dispose
	};
};

export type DelayedHoverTooltip = ReturnType<typeof createDelayedHoverTooltip>;

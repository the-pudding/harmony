import type { HoverCardAnchor } from "./hoverCardPosition.js";

export const TOOLTIP_SETTLE_DELAY_MS = 500;

export const createDelayedHoverTooltip = () => {
	let pendingSongKey = $state<string | null>(null);
	let pendingAnchor = $state<HoverCardAnchor | null>(null);
	let tooltipSongKey = $state<string | null>(null);
	let tooltipAnchor = $state<HoverCardAnchor | null>(null);
	let isDragging = $state(false);
	let settleTimeoutId: ReturnType<typeof setTimeout> | null = null;

	const clearSettleTimeout = () => {
		if (settleTimeoutId === null) return;
		clearTimeout(settleTimeoutId);
		settleTimeoutId = null;
	};

	const hideTooltip = () => {
		tooltipSongKey = null;
		tooltipAnchor = null;
	};

	const scheduleSettle = () => {
		clearSettleTimeout();
		if (pendingSongKey === null || pendingAnchor === null || isDragging) {
			hideTooltip();
			return;
		}
		settleTimeoutId = setTimeout(() => {
			if (pendingSongKey === null || pendingAnchor === null || isDragging) return;
			tooltipSongKey = pendingSongKey;
			tooltipAnchor = pendingAnchor;
		}, TOOLTIP_SETTLE_DELAY_MS);
	};

	const setHover = (songKey: string | null, anchor: HoverCardAnchor | null) => {
		pendingSongKey = songKey;
		pendingAnchor = anchor;
		hideTooltip();
		scheduleSettle();
	};

	const clearHover = () => {
		pendingSongKey = null;
		pendingAnchor = null;
		clearSettleTimeout();
		hideTooltip();
	};

	const startDrag = () => {
		isDragging = true;
		clearSettleTimeout();
		hideTooltip();
	};

	const endDrag = () => {
		isDragging = false;
		scheduleSettle();
	};

	const dispose = () => {
		clearSettleTimeout();
	};

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

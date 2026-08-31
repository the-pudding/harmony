export const HOVER_CARD_WIDTH = 400;
export const HOVER_CARD_OFFSET = 16;
export const HOVER_CARD_TOP_LIFT = 24;
export const HOVER_CARD_MIN_TOP = 8;
export const HOVER_CARD_VIEWPORT_MARGIN_REM = 1;
export const HOVER_CARD_MAX_HEIGHT = `calc(100dvh - ${HOVER_CARD_VIEWPORT_MARGIN_REM * 2}rem)`;

export type HoverCardAnchor = { x: number; y: number };

export const hoverCardStyle = (
	anchor: HoverCardAnchor | null,
	containerWidth: number,
	cardWidth: number = HOVER_CARD_WIDTH
): string => {
	if (!anchor) return "";
	const flipLeft = anchor.x + HOVER_CARD_OFFSET + cardWidth > containerWidth;
	const left = flipLeft
		? anchor.x - HOVER_CARD_OFFSET - cardWidth
		: anchor.x + HOVER_CARD_OFFSET;
	const top = Math.max(HOVER_CARD_MIN_TOP, anchor.y - HOVER_CARD_TOP_LIFT);
	return `left: ${left}px; top: ${top}px; width: ${cardWidth}px; max-height: ${HOVER_CARD_MAX_HEIGHT};`;
};

export const anchorFromMouseEvent = (
	event: MouseEvent,
	container: HTMLElement
): HoverCardAnchor => {
	const rect = container.getBoundingClientRect();
	return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

export const CLICK_DRAG_THRESHOLD_PX = 5;

export const createClickAfterDragGuard = () => {
	let pointerDown: { x: number; y: number } | null = null;
	let maxPointerMovePx = 0;
	let interactionDragged = false;

	type PointerLikeEvent = Pick<PointerEvent, "clientX" | "clientY">;

	const pointerDistance = (
		event: PointerLikeEvent,
		origin: { x: number; y: number }
	): number => Math.hypot(event.clientX - origin.x, event.clientY - origin.y);

	const onPointerDown = (event: PointerLikeEvent) => {
		pointerDown = { x: event.clientX, y: event.clientY };
		maxPointerMovePx = 0;
	};

	const onPointerMove = (event: PointerLikeEvent) => {
		if (pointerDown === null) return;
		maxPointerMovePx = Math.max(
			maxPointerMovePx,
			pointerDistance(event, pointerDown)
		);
	};

	const onPointerUp = () => {
		pointerDown = null;
	};

	const onInteractionDragStart = () => {
		interactionDragged = true;
	};

	const shouldSuppressClick = (): boolean => {
		const suppress =
			interactionDragged || maxPointerMovePx > CLICK_DRAG_THRESHOLD_PX;
		interactionDragged = false;
		maxPointerMovePx = 0;
		return suppress;
	};

	return {
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onInteractionDragStart,
		shouldSuppressClick
	};
};

export type ClickAfterDragGuard = ReturnType<typeof createClickAfterDragGuard>;

const PERCENT = 100;

export const toPercent = (fraction: number): string => `${fraction * PERCENT}%`;

export const pointerFractionOf = (
	event: MouseEvent & { currentTarget: HTMLElement }
): number => {
	const bounds = event.currentTarget.getBoundingClientRect();
	return (event.clientX - bounds.left) / bounds.width;
};

export const spanStyle = (span: {
	startFraction: number;
	endFraction: number;
}): string =>
	`left: ${toPercent(span.startFraction)}; width: ${toPercent(span.endFraction - span.startFraction)};`;

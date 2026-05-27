import type { Action } from "svelte/action";

type CheckOverlapParams = {
	reverse?: boolean;
	query?: string;
};

function intersects(
	[minAx, minAy, maxAx, maxAy]: [number, number, number, number],
	[minBx, minBy, maxBx, maxBy]: [number, number, number, number]
) {
	const aLeftOfB = maxAx < minBx;
	const aRightOfB = minAx > maxBx;
	const aAboveB = minAy > maxBy;
	const aBelowB = maxAy < minBy;
	return !(aLeftOfB || aRightOfB || aAboveB || aBelowB);
}

const isOverlapping = (nodes: Element[]) => {
	const root = nodes[0];
	const { top, left, right, bottom } = root.getBoundingClientRect();
	const a: [number, number, number, number] = [left, top, right, bottom];
	const matches = nodes.slice(1).find((node) => {
		if (node.classList.contains("is-overlap")) return false;
		const r = node.getBoundingClientRect();
		const b: [number, number, number, number] = [r.left, r.top, r.right, r.bottom];
		return intersects(a, b);
	});
	return !!matches;
};

const checkOverlap: Action<HTMLElement, CheckOverlapParams> = (node, params = {}) => {
	const check = ({ reverse, query }: CheckOverlapParams) => {
		const elements = [...node.querySelectorAll(query || ":scope > *:not(iframe)")];
		if (reverse) elements.reverse();
		elements.forEach((el, i) => {
			const overlap = isOverlapping(elements.slice(i));
			if (overlap) el.classList.add("is-overlap");
			else el.classList.remove("is-overlap");
		});
	};

	check(params);

	return {
		update(p) {
			check(p);
		},
		destroy() {}
	};
};

export default checkOverlap;

import type { Action } from "svelte/action";

type KeepWithinBoxParams = {
	width?: number;
};

function getXY(node: SVGElement) {
	return node
		.getAttribute("transform")
		?.split(",")
		.map((d) => +d.replace(/[^0-9.]/g, "")) ?? [0, 0];
}

const keepWithinBox: Action<SVGElement, KeepWithinBoxParams> = (node, params = {}) => {
	const check = ({ width }: KeepWithinBoxParams) => {
		if (width === undefined) return;
		const { left, right } = node.getBoundingClientRect();
		const [x, y] = getXY(node);
		const w = right - left;
		const rightEdge = x + w / 2;
		const leftEdge = x - w / 2;

		if (rightEdge > width) {
			const diff = rightEdge - width;
			node.setAttribute("transform", `translate(${x - diff}, ${y})`);
		} else if (leftEdge < 0) {
			const diff = Math.abs(leftEdge);
			node.setAttribute("transform", `translate(${x + diff}, ${y})`);
		}
	};

	check(params);

	return {
		update(p) {
			check(p);
		},
		destroy() {}
	};
};

export default keepWithinBox;

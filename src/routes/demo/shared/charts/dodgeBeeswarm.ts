export type DodgedPoint<Item> = {
	item: Item;
	x: number;
	y: number;
};

type Chained<Item> = DodgedPoint<Item> & { next: Chained<Item> | null };

const EPSILON = 1e-3;

/**
 * Stacks points that would overlap on a shared baseline, using the classic
 * d3 "dodge" sweep: walk left to right and lift each point to the lowest
 * free slot above the ones already placed.
 */
export const dodgeBeeswarm = <Item>(
	items: readonly Item[],
	xOf: (item: Item) => number,
	dotRadius: number,
	dotSpacing: number
): DodgedPoint<Item>[] => {
	const diameter = dotRadius * 2 + dotSpacing;
	const radiusSquared = diameter ** 2;

	const nodes: Chained<Item>[] = items
		.map((item) => ({ item, x: xOf(item), y: 0, next: null }))
		.sort((first, second) => first.x - second.x);

	let head: Chained<Item> | null = null;
	let tail: Chained<Item> | null = null;

	const intersects = (x: number, y: number): boolean => {
		let candidate = head;
		while (candidate) {
			if (
				radiusSquared - EPSILON >
				(candidate.x - x) ** 2 + (candidate.y - y) ** 2
			)
				return true;
			candidate = candidate.next;
		}
		return false;
	};

	for (const node of nodes) {
		while (head && head.x < node.x - radiusSquared) head = head.next;

		if (intersects(node.x, 0)) {
			let placed = head;
			node.y = Infinity;
			do {
				const candidateY =
					placed!.y + Math.sqrt(radiusSquared - (placed!.x - node.x) ** 2);
				if (candidateY < node.y && !intersects(node.x, candidateY))
					node.y = candidateY;
				placed = placed!.next;
			} while (placed);
		}

		node.next = null;
		if (!head) head = tail = node;
		else tail = tail!.next = node;
	}

	return nodes.map(({ item, x, y }) => ({ item, x, y }));
};

export const tallestStackHeight = (points: readonly { y: number }[]): number =>
	points.length > 0 ? Math.max(0, ...points.map((point) => point.y)) : 0;

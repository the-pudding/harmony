export type ScatterPoint = {
	songKey: string;
	x: number;
	y: number;
	groupShares: { groupName: string; share: number }[];
};

export type ScatterAxisLabels = { x: string; y: string };

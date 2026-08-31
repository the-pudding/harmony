export type ScatterPoint = {
	songKey: string;
	x: number;
	y: number;
	z?: number;
	groupShares: { groupName: string; share: number }[];
};

export type ScatterAxisLabels = { x: string; y: string };

export const SCATTER_NORMAL_ALPHA = 0.8;
export const SCATTER_DIMMED_ALPHA = 0.18;

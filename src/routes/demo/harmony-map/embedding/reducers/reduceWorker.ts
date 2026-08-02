import { runPca } from "./pca.js";
import { runUmap } from "./umap.js";
import type { ReducerMethod, ReductionResult } from "./types.js";

export type ReduceWorkerRequest = {
	requestId: number;
	method: ReducerMethod;
	matrix: number[][];
};

export type ReduceWorkerResponse = {
	requestId: number;
	result: ReductionResult;
};

const reduce = (method: ReducerMethod, matrix: number[][]): ReductionResult =>
	method === "pca" ? runPca(matrix) : runUmap(matrix);

self.onmessage = (event: MessageEvent<ReduceWorkerRequest>) => {
	const { requestId, method, matrix } = event.data;
	const response: ReduceWorkerResponse = {
		requestId,
		result: reduce(method, matrix)
	};
	self.postMessage(response);
};

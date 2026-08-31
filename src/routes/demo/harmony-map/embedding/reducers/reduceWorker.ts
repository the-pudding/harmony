import { runPca } from "./pca.js";
import { runUmap } from "./umap.js";
import type { ReducerMethod, ReductionResult, UmapOptions } from "./types.js";

export type ReduceWorkerRequest = {
	requestId: number;
	method: ReducerMethod;
	matrix: number[][];
	componentCount: number;
	umapOptions?: UmapOptions;
};

export type ReduceWorkerResponse = {
	requestId: number;
	result: ReductionResult;
};

const reduce = (
	method: ReducerMethod,
	matrix: number[][],
	componentCount: number,
	umapOptions?: UmapOptions
): ReductionResult =>
	method === "pca"
		? runPca(matrix, componentCount)
		: runUmap(matrix, componentCount, umapOptions);

self.onmessage = (event: MessageEvent<ReduceWorkerRequest>) => {
	const { requestId, method, matrix, componentCount, umapOptions } = event.data;
	const response: ReduceWorkerResponse = {
		requestId,
		result: reduce(method, matrix, componentCount, umapOptions)
	};
	self.postMessage(response);
};

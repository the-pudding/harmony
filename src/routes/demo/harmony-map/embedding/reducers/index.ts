import ReduceWorker from "./reduceWorker.ts?worker";
import type {
	ReduceWorkerRequest,
	ReduceWorkerResponse
} from "./reduceWorker.js";
import type { ReducerMethod, ReductionResult } from "./types.js";

export * from "./types.js";
export { PCA_COMPONENT_COUNT, TOP_LOADINGS_PER_COMPONENT } from "./pca.js";
export {
	UMAP_MIN_DISTANCE,
	UMAP_NEIGHBOR_COUNT,
	UMAP_RANDOM_SEED
} from "./umap.js";

let reduceWorker: Worker | null = null;
let nextRequestId = 0;

const ensureReduceWorker = (): Worker => {
	const worker = reduceWorker ?? new ReduceWorker();
	reduceWorker = worker;
	return worker;
};

export const reduceOffMainThread = (
	method: ReducerMethod,
	matrix: number[][]
): Promise<ReductionResult> => {
	const worker = ensureReduceWorker();
	const requestId = ++nextRequestId;

	return new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent<ReduceWorkerResponse>) => {
			if (event.data.requestId !== requestId) return;
			cleanup();
			resolve(event.data.result);
		};

		const onError = (error: ErrorEvent) => {
			cleanup();
			reject(error.error ?? new Error(error.message));
		};

		const cleanup = () => {
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
		};

		worker.addEventListener("message", onMessage);
		worker.addEventListener("error", onError);

		const request: ReduceWorkerRequest = { requestId, method, matrix };
		worker.postMessage(request);
	});
};

export const terminateReduceWorker = (): void => {
	reduceWorker?.terminate();
	reduceWorker = null;
};

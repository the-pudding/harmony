export const CLUSTER_DIMMED_ANNOTATION_ALPHA = 0.001;

export const clusterAnnotationAlpha = (
	emphasizedClusterHashes: Set<string> | null,
	clusterHash: string,
	hasName: boolean,
	unnamedAlpha: number
): number => {
	if (emphasizedClusterHashes === null) {
		return hasName ? 1 : unnamedAlpha;
	}
	if (emphasizedClusterHashes.has(clusterHash)) {
		return hasName ? 1 : unnamedAlpha;
	}
	return CLUSTER_DIMMED_ANNOTATION_ALPHA;
};

export const clusterMeshOpacity = (
	emphasizedClusterHashes: Set<string> | null,
	clusterHash: string,
	activeOpacity: number
): number => {
	if (emphasizedClusterHashes === null) return activeOpacity;
	if (emphasizedClusterHashes.has(clusterHash)) return activeOpacity;
	return CLUSTER_DIMMED_ANNOTATION_ALPHA;
};

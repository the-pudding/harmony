// Shared by tasks/build-charts.ts (which writes the per-cluster % over time
// files) and ClusterPercentOverTime.svelte (which globs them), so a file is
// always found by its cluster name, or by its decade for decade signatures.
// Files are named `{slug}_by_year.csv`, optionally prefixed with a decade
// (`1990s_{slug}_by_year.csv`) for decade signature progressions.
export const BY_YEAR_SUFFIX = "_by_year.csv";

export const clusterSlug = (cluster: string): string =>
	cluster.replace(/[()]/g, "").trim().replace(/\s+/g, "-");

export const byYearFile = (cluster: string, decade?: number): string =>
	`${decade ? `${decade}s_` : ""}${clusterSlug(cluster)}${BY_YEAR_SUFFIX}`;

// The key a file is looked up by: its decade (e.g. "1990s") for decade
// signature files, since the story asks for those by decade whatever
// progression was picked, otherwise its cluster slug.
export const keyFromByYearFile = (filePath: string): string => {
	const fileName = filePath.split("/").pop()!;
	return (
		fileName.match(/^(\d{4}s)_/)?.[1] ?? fileName.replace(BY_YEAR_SUFFIX, "")
	);
};

// The cluster slug a file belongs to, with any decade prefix dropped.
export const slugFromByYearFile = (filePath: string): string =>
	filePath
		.split("/")
		.pop()!
		.replace(/^\d{4}s_/, "")
		.replace(BY_YEAR_SUFFIX, "");

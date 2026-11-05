const REPO_JSON_FORMAT = {
	parser: "json",
	useTabs: true,
	trailingComma: "none",
	printWidth: 80
} as const;

export const formatJsonLikeRepo = async (value: unknown): Promise<string> => {
	const [prettier, babelPlugin, estreePlugin] = await Promise.all([
		import("prettier/standalone"),
		import("prettier/plugins/babel"),
		import("prettier/plugins/estree")
	]);
	return prettier.format(JSON.stringify(value), {
		...REPO_JSON_FORMAT,
		plugins: [babelPlugin, estreePlugin]
	});
};

declare module "$data/copy.json" {
	const copy: {
		meta: { title: string; description: string };
		body: {
			section: string;
			content: { type: string; value: unknown }[];
		}[];
	};
	export default copy;
}

declare module "$data/copy.json" {
	const copy: {
		meta: { title: string; description: string };
		hed: string;
		byline: string;
		slides: {
			text: { type: string; value: string }[];
		}[];
	};
	export default copy;
}

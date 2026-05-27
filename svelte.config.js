import adapterStatic from "@sveltejs/adapter-static";
import { sveltePreprocess } from "svelte-preprocess";
import autoprefixer from "autoprefixer";

const preprocess = sveltePreprocess({
	postcss: {
		plugins: [autoprefixer]
	}
});

const config = {
	compilerOptions: {
		runes: true
	},
	preprocess,
	kit: {
		adapter: adapterStatic({ strict: false }),
		alias: {
			$actions: "src/actions",
			$components: "src/components",
			$data: "src/data",
			$routes: "src/routes",
			$runes: "src/runes",
			$stores: "src/stores",
			$styles: "src/styles",
			$svg: "src/svg",
			$utils: "src/utils",
			$types: "src/types"
		}
	}
};

export default config;

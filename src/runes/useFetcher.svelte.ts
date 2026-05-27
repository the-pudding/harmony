import { csvParse, type DSVRowArray } from "d3";

type FetcherOptions = RequestInit | undefined;

export const useFetcher = (initialUrl: string | null, options?: FetcherOptions) => {
	let url = $state(initialUrl);
	let data = $state<unknown>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const setLoading = (isLoading = true) => {
		loading = isLoading;
		if (isLoading) {
			error = null;
			data = null;
		}
	};

	const fetchData = async () => {
		if (!url) return [null, null] as const;
		try {
			const res = await fetch(url, options);
			if (!res.ok) throw new Error(`Unexpected error occurred (status ${res.status})`);

			if (url.includes(".csv")) {
				const csv = await res.text();
				return [null, csvParse(csv) as DSVRowArray] as const;
			}
			return [null, (await res.json()) as unknown] as const;
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unexpected error occurred";
			return [message, null] as const;
		}
	};

	const handleUrlChange = async (currentUrl: string | null) => {
		setLoading(true);
		const [err, response] = await fetchData();
		if (currentUrl !== url) return;

		if (err) {
			setLoading(false);
			error = err;
			return;
		}

		setLoading(false);
		data = response;
	};

	$effect(() => {
		handleUrlChange(url);
	});

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get url() {
			return url;
		},
		set url(newUrl: string | null) {
			if (url !== newUrl) url = newUrl;
		}
	};
};

export default useFetcher;

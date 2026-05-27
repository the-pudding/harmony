type ClipboardConfig = { delay?: number };

const copyMethods = [
	async (str: string) => {
		await navigator.clipboard.writeText(str);
	},
	async (str: string) => {
		const textarea = document.createElement("textarea");
		textarea.value = str;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		document.execCommand("copy");
		document.body.removeChild(textarea);
	}
];

const useClipboard = (copyString: string | number, config: ClipboardConfig = {}) => {
	const { delay = 1000 } = config;
	let lastCopied = $state<number | null>(null);
	const copied = $derived(lastCopied !== null);

	const copyToClipboard = async (strToCopy: string) => {
		for (const method of copyMethods) {
			try {
				await method(strToCopy);
				return;
			} catch (error) {
				console.error("Copy method failed:", error);
			}
		}
		throw new Error("Copy failed, browser not supported.");
	};

	const copy = async (newCopyString?: string | number) => {
		if (newCopyString !== undefined && typeof newCopyString !== "string" && typeof newCopyString !== "number") {
			throw new Error("Invalid copy type: Only string and number are supported.");
		}

		const time = Date.now();
		lastCopied = time;
		const str = String(newCopyString === undefined ? copyString : newCopyString);
		await copyToClipboard(str);
		await new Promise((res) => setTimeout(res, delay));
		if (time !== lastCopied) return;
		lastCopied = null;
	};

	return { get copied() { return copied; }, copy };
};

export default useClipboard;

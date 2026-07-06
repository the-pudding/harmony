import debounce from "lodash.debounce";

const getWidth = () =>
	window?.visualViewport?.width ?? document.documentElement.clientWidth;

const getHeight = () =>
	window?.visualViewport?.height ?? document.documentElement.clientHeight;

export default class UseWindowDimensions {
	#width = $state(0);
	#height = $state(0);
	#debouncedResize: ReturnType<typeof debounce> | undefined;

	#onResize() {
		this.#width = getWidth();
		this.#height = getHeight();
	}

	constructor(ms = 250) {
		$effect(() => {
			this.#onResize();
			this.#debouncedResize = debounce(this.#onResize.bind(this), ms);
			window?.visualViewport?.addEventListener("resize", this.#debouncedResize);
			return () => {
				window?.visualViewport?.removeEventListener(
					"resize",
					this.#debouncedResize!
				);
			};
		});
	}

	get width() {
		return this.#width;
	}

	get height() {
		return this.#height;
	}
}

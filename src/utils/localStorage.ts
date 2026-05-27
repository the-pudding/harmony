let hasStorage: boolean | undefined;

const isReady = () => {
	if (hasStorage !== undefined) return hasStorage;
	try {
		const storage = window.localStorage;
		const x = "__storage_test__";
		storage.setItem(x, x);
		storage.removeItem(x);
		hasStorage = true;
	} catch {
		hasStorage = false;
	}
	return hasStorage;
};

const remove = (key: string) => {
	if (!isReady()) return;
	try {
		localStorage.removeItem(key);
	} catch (err) {
		console.log(err);
	}
};

const set = (key: string, value: unknown) => {
	if (!isReady()) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (err) {
		console.log(err);
	}
};

const get = <T = unknown>(key: string): T | undefined => {
	if (!isReady()) return undefined;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : undefined;
	} catch (err) {
		console.log(err);
		return undefined;
	}
};

export default { set, get, remove };

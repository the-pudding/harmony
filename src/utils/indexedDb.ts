export type IdbStore = {
	db: IDBDatabase;
	storeName: string;
};

export const openStore = (
	dbName: string,
	version: number,
	storeName: string
): Promise<IdbStore> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName, version);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(storeName)) {
				db.createObjectStore(storeName);
			}
		};

		request.onsuccess = () => resolve({ db: request.result, storeName });
		request.onerror = () => reject(request.error);
	});

export const getJson = <T>(store: IdbStore, key: string): Promise<T | undefined> =>
	new Promise((resolve, reject) => {
		const request = store.db
			.transaction(store.storeName, "readonly")
			.objectStore(store.storeName)
			.get(key);
		request.onsuccess = () => resolve(request.result as T | undefined);
		request.onerror = () => reject(request.error);
	});

export const setJson = <T>(store: IdbStore, key: string, value: T): Promise<void> =>
	new Promise((resolve, reject) => {
		const request = store.db
			.transaction(store.storeName, "readwrite")
			.objectStore(store.storeName)
			.put(value, key);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});

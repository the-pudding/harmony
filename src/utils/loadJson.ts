export default async function loadJson<T = unknown>(url: string) {
	const response = await fetch(url);
	return response.json() as Promise<T>;
}

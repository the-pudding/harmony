function get(key: string) {
	const name = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
	const results = regex.exec(window.location.search);
	return results === null
		? ""
		: decodeURIComponent(results[1].replace(/\+/g, " "));
}

function set(key: string, value: string | null | undefined) {
	const baseUrl = [
		window.location.protocol,
		"//",
		window.location.host,
		window.location.pathname
	].join("");
	const urlQueryString = document.location.search;
	const newParam = `${key}=${value}`;
	let params = `?${newParam}`;

	if (urlQueryString) {
		const updateRegex = new RegExp(`([\\?&])${key}[^&]*`);
		const removeRegex = new RegExp(`([\\?&])${key}=[^&;]+[&;]?`);

		if (value === undefined || value === null || value === "") {
			params = urlQueryString.replace(removeRegex, "$1");
			params = params.replace(/[&;]$/, "");
		} else if (urlQueryString.match(updateRegex) !== null) {
			params = urlQueryString.replace(updateRegex, `$1${newParam}`);
		} else {
			params = `${urlQueryString}&${newParam}`;
		}
	}

	params = params === "?" ? "" : params;
	window.history.replaceState({}, "", `${baseUrl}${params}`);
}

export default { get, set };

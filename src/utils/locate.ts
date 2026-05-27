const TEST_DATA = {
	testing: "This is localhost testing data",
	city: "Lee",
	country: "US",
	hostname: "cpe-74-76-154-164.nycap.res.rr.com",
	ip: "74.76.154.164",
	loc: "42.3043,-73.2482",
	org: "AS11351 Charter Communications Inc",
	postal: "01238",
	region: "Massachusetts",
	timezone: "America/New_York"
};

const MAX_TIME = 4000;

async function lookup(test: boolean) {
	if (test) return TEST_DATA;
	const request = await fetch("https://ipinfo.io/json?token=6f0f9c88db028a");
	return request.json();
}

function init(test = false) {
	return new Promise<typeof TEST_DATA>((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("timeout")), MAX_TIME);
		lookup(test)
			.then((data) => {
				clearTimeout(timeout);
				resolve(data);
			})
			.catch(reject);
	});
}

export default init;

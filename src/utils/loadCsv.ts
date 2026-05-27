import { csvParse, type DSVRowArray } from "d3";

export default async function loadCsv(url: string) {
	const response = await fetch(url);
	const csv = await response.text();
	return csvParse(csv) as DSVRowArray;
}

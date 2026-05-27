import loadImage from "./loadImage";

type Pixel = {
	i: number;
	x: number;
	y: number;
	r: number;
	g: number;
	b: number;
	a: number;
	rgb: string;
};

const getPixels = ({ data, width }: { data: Uint8ClampedArray; width: number }) => {
	const output: Pixel[] = [];
	for (let index = 0; index < data.length; index += 4) {
		const i = Math.floor(index / 4);
		const x = i % width;
		const y = Math.floor(i / width);
		const r = data[index];
		const g = data[index + 1];
		const b = data[index + 2];
		const a = data[index + 3];
		const rgb = `rgb(${r},${g},${b})`;
		output.push({ i, x, y, r, g, b, a, rgb });
	}
	return output;
};

export default function loadPixels(src: string) {
	return new Promise<Pixel[]>((resolve, reject) => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			reject(new Error("Canvas 2d context unavailable"));
			return;
		}

		loadImage(src)
			.then((img) => {
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0, img.width, img.height);
				const { data, width } = ctx.getImageData(0, 0, img.width, img.height);
				resolve(getPixels({ data, width }));
			})
			.catch(reject);
	});
}

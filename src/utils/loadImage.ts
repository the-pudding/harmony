export default function loadImage(url: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`error loading ${url}`));
		img.src = url;
	});
}

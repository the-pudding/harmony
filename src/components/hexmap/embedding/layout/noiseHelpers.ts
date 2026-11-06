// Fast 2D value noise used for hex watercolor granulation texture.

// Wang-hash-inspired integer hash: maps a 2D integer grid point to [0, 1).
const intHash2d = (x: number, y: number): number => {
	let h = (Math.imul(x, 1664525) ^ Math.imul(y, 1013904223)) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
	h = (h ^ (h >>> 16)) >>> 0;
	return h / 0x100000000;
};

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const valueNoise = (x: number, y: number): number => {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = smoothstep(x - ix);
	const fy = smoothstep(y - iy);
	return (
		intHash2d(ix, iy) * (1 - fx) * (1 - fy) +
		intHash2d(ix + 1, iy) * fx * (1 - fy) +
		intHash2d(ix, iy + 1) * (1 - fx) * fy +
		intHash2d(ix + 1, iy + 1) * fx * fy
	);
};

// Fractal value noise: `octaves` layers at doubling frequency, halving amplitude.
export const fractalValueNoise = (
	x: number,
	y: number,
	octaves: number
): number => {
	let value = 0;
	let amplitude = 1;
	let total = 0;
	for (let o = 0; o < octaves; o++) {
		value += amplitude * valueNoise(x, y);
		total += amplitude;
		amplitude *= 0.5;
		x *= 2;
		y *= 2;
	}
	return value / total;
};

// Alpha transfer matching the SVG NOISE_ALPHA_MATRIX: -0.9 * n + 1.2, clamped.
// At noise=0 → alpha=1 (fully opaque).
// At noise=1 → alpha=0.3 (grain visible).
// At noise≥1.33 → alpha=0 (fully transparent).
const noiseToAlpha = (noise: number): number =>
	Math.max(0, Math.min(1, noise * -0.9 + 1.2));

// Fills `data` (a size×size RGBA Uint8ClampedArray) with the noise tile.
// Each pixel: RGB=255, alpha=noiseToAlpha(fractalValueNoise).
// `frequency` controls how many noise cycles fit in one tile width.
// Separated from ImageData construction so it can run in non-browser environments.
export const fillNoiseTileData = (
	data: Uint8ClampedArray,
	size: number,
	frequency: number,
	octaves: number
): void => {
	for (let py = 0; py < size; py++) {
		for (let px = 0; px < size; px++) {
			const noise = fractalValueNoise(px * frequency, py * frequency, octaves);
			const alpha = noiseToAlpha(noise);
			const idx = (py * size + px) * 4;
			data[idx] = 255;
			data[idx + 1] = 255;
			data[idx + 2] = 255;
			data[idx + 3] = Math.round(alpha * 255);
		}
	}
};

// Renders a square noise tile into an ImageData suitable for use as a
// CanvasPattern. Wraps fillNoiseTileData with the browser ImageData constructor.
export const renderNoiseTile = (
	size: number,
	frequency: number,
	octaves: number
): ImageData => {
	const data = new Uint8ClampedArray(size * size * 4);
	fillNoiseTileData(data, size, frequency, octaves);
	return new ImageData(data, size, size);
};

// Minimal Oklab / OKLCH helpers (d3-color has Lab and HCL, not Oklab).
// Oklab keeps perceived lightness steady while changing hue, so lifting or
// averaging colors here doesn't shift them the way sRGB math does.

export type Oklab = [l: number, a: number, b: number];
export type Oklch = [l: number, c: number, hDegrees: number];

const toLinear = (c: number) =>
	c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toGamma = (c: number) =>
	c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

export const hexToOklab = (hex: string): Oklab => {
	const n = parseInt(hex.slice(1), 16);
	const r = toLinear(((n >> 16) & 255) / 255);
	const g = toLinear(((n >> 8) & 255) / 255);
	const b = toLinear((n & 255) / 255);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
};

const oklabToRgb = ([L, a, b]: Oklab): number[] => {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	].map(toGamma);
};

const GAMUT_TOLERANCE = 0.001;
const inGamut = (rgb: readonly number[]) =>
	rgb.every((v) => v >= -GAMUT_TOLERANCE && v <= 1 + GAMUT_TOLERANCE);

const rgbToHex = (rgb: readonly number[]) =>
	"#" +
	rgb
		.map((v) =>
			Math.round(Math.min(1, Math.max(0, v)) * 255)
				.toString(16)
				.padStart(2, "0")
		)
		.join("");

export const hexToOklch = (hex: string): Oklch => {
	const [l, a, b] = hexToOklab(hex);
	const h = (Math.atan2(b, a) * 180) / Math.PI;
	return [l, Math.hypot(a, b), (h + 360) % 360];
};

// Out-of-gamut colors keep their lightness and hue and lose chroma until
// they fit in sRGB.
export const oklchToHex = ([l, c, h]: Oklch): string => {
	const radians = (h * Math.PI) / 180;
	let chroma = c;
	const at = (chroma: number): Oklab => [
		l,
		chroma * Math.cos(radians),
		chroma * Math.sin(radians)
	];
	for (let step = 0; step < 40 && !inGamut(oklabToRgb(at(chroma))); step++) {
		chroma *= 0.95;
	}
	return rgbToHex(oklabToRgb(at(chroma)));
};

export const oklabToHex = ([l, a, b]: Oklab): string => {
	const h = (Math.atan2(b, a) * 180) / Math.PI;
	return oklchToHex([l, Math.hypot(a, b), h]);
};

// The plain Oklab average of the colors.
export const mixOklab = (hexes: readonly string[]): string => {
	const labs = hexes.map(hexToOklab);
	const mean = [0, 1, 2].map(
		(index) => labs.reduce((sum, lab) => sum + lab[index], 0) / labs.length
	) as Oklab;
	return oklabToHex(mean);
};

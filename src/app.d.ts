declare global {
	const __VERSION__: string;
	const __TIMESTAMP__: string;
}

declare module "*.json" {
	const value: Record<string, unknown>;
	export default value;
}

export {};

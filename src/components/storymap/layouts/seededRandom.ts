// Deterministic hash-based randomness, so a reload gives the same layout.
// FNV-1a as in songShardFor; the salt is hashed first so salts are independent.
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const fnv1a = (hash: number, text: string): number => {
	for (let index = 0; index < text.length; index++) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, FNV_PRIME);
	}
	return hash;
};

export const hashUnit = (songKey: string, salt = ""): number => {
	let hash = fnv1a(FNV_OFFSET, salt);
	hash = fnv1a(hash ^ 0xff, songKey);
	// murmur3's finalizer: FNV's low bits alone are too regular.
	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x85ebca6b);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 0xc2b2ae35);
	hash ^= hash >>> 16;
	return (hash >>> 0) / 0x100000000;
};

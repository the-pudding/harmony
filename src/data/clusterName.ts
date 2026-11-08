// The one rule for matching cluster names: trimmed and case-insensitive.
// reference.csv, the map snapshot and the copy can each spell a name a
// little differently.
export const normalizeClusterName = (name: string): string =>
	name.trim().toLowerCase();

export const sameClusterName = (
	a: string | null | undefined,
	b: string | null | undefined
): boolean =>
	a != null && b != null && normalizeClusterName(a) === normalizeClusterName(b);

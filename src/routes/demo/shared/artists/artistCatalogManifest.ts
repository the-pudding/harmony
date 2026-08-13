export const ARTIST_CATALOG_MANIFEST_URL = "/data/artists/index.json";

export type ArtistCatalogManifestEntry = {
	slug: string;
	artistName: string;
	songCount: number;
};

export const fetchArtistCatalogManifest = async (): Promise<
	ArtistCatalogManifestEntry[]
> => {
	const response = await fetch(ARTIST_CATALOG_MANIFEST_URL);
	if (!response.ok) return [];
	return response.json();
};

export const artistCatalogSlugByName = (
	manifest: readonly ArtistCatalogManifestEntry[]
): ReadonlyMap<string, string> =>
	new Map(manifest.map((entry) => [entry.artistName, entry.slug]));

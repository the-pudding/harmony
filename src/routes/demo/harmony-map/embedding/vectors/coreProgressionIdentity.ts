import coreProgressions from "$data/core-progressions.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";

export type CoreProgressionIdentity = {
	name: string;
	canonicalKey: string;
	variants: string[];
};

// The first authored variant is the canonical key: deterministic, and independent
// of which variant happens to win a match in the current corpus.
const identities: CoreProgressionIdentity[] = coreProgressions.map(
	(progression) => {
		const variants = chordProgressionVariants(progression.chordProgression);
		return { name: progression.name, canonicalKey: variants[0], variants };
	}
);

const identityByVariant = new Map(
	identities.flatMap((identity) =>
		identity.variants.map((variant): [string, CoreProgressionIdentity] => [
			variant,
			identity
		])
	)
);

export const canonicalProgressionKey = (chordProgression: string): string =>
	identityByVariant.get(chordProgression)?.canonicalKey ?? chordProgression;

export const coreProgressionIdentityFor = (
	chordProgression: string
): CoreProgressionIdentity | null =>
	identityByVariant.get(chordProgression) ?? null;

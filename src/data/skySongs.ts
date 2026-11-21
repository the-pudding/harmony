// The songs the night sky ("sky" layout) names: big hits from across the
// decades, and the examples the piece plays later on. They sit on either
// side of the text column, never behind the text, videos or title card.
import { featuredSongKeys } from "./featuredClusters.js";
import { signatureSongs } from "./signatureSongs.js";
import { videoCues } from "./videoCues.js";

// Slide 0's lone star, which the map zooms out from.
export const SKY_OPENING_SONG = "journey__dont-stop-believin";

// Hand-picked: no popularity data in the snapshot. Roughly by year.
export const SKY_BIG_HITS = [
	"the-beatles__i-want-to-hold-your-hand",
	"the-temptations__my-girl",
	"the-beach-boys__good-vibrations",
	"aretha-franklin__respect",
	"the-beatles__hey-jude",
	"bee-gees__stayin-alive",
	"abba__dancing-queen",
	"eagles__hotel-california",
	"michael-jackson__billie-jean",
	"prince-and-the-revolution__purple-rain",
	"madonna__like-a-prayer",
	"guns-n-roses__sweet-child-o-mine",
	"nirvana__smells-like-teen-spirit",
	"whitney-houston__i-will-always-love-you",
	"los-del-rio__macarena-bayside-boys-mix",
	"spice-girls__wannabe",
	"britney-spears__baby-one-more-time",
	"outkast__hey-ya",
	"beyonce__crazy-in-love-ft-jay-z",
	"rihanna__umbrella",
	"beyonce__single-ladies",
	"adele__rolling-in-the-deep",
	"mark-ronson-featuring-bruno-mars__uptown-funk",
	"ed-sheeran__shape-of-you",
	"luis-fonsi-daddy-yankee-featuring-justin-bieber__despacito",
	"billie-eilish__bad-guy",
	"lil-nas-x-featuring-billy-ray-cyrus__old-town-road",
	"the-weeknd__blinding-lights",
	"taylor-swift__anti-hero"
];

// Songs named in the story later: the clusters' featured songs and the
// decades' signature songs.
export const SKY_EXAMPLE_SONGS = [
	...new Set([
		...featuredSongKeys,
		...Object.values(signatureSongs).flatMap(({ songs }) =>
			songs.map(({ songKey }) => songKey)
		)
	])
];

// Songs the videos show (and slide 0's lone star), lit while they play.
const VIDEO_SONGS = Object.values(videoCues).flatMap((cues) =>
	cues.flatMap(({ songKey }) => (songKey === null ? [] : [songKey]))
);

// Every song placed around the edge and held in place.
export const SKY_PINNED_SONGS: ReadonlySet<string> = new Set([
	...VIDEO_SONGS,
	...SKY_BIG_HITS,
	...SKY_EXAMPLE_SONGS
]);

// The order the sky spotlights songs in: a big hit, then an example, and so
// on, the examples spread out so neighbors in the list aren't neighbors here.
export const SKY_CYCLE_SONGS: readonly string[] = (() => {
	const examples = [...SKY_EXAMPLE_SONGS].sort();
	const stride = 37; // coprime with any plausible length; just a shuffle
	const shuffled = examples.map(
		(_, index) => examples[(index * stride) % examples.length]
	);
	const unique = shuffled.length === new Set(shuffled).size;
	const spread = unique ? shuffled : examples;
	const order: string[] = [];
	const longest = Math.max(SKY_BIG_HITS.length, spread.length);
	for (let index = 0; index < longest; index++) {
		if (index < SKY_BIG_HITS.length) order.push(SKY_BIG_HITS[index]);
		if (index < spread.length) order.push(spread[index]);
	}
	return [...new Set(order)];
})();

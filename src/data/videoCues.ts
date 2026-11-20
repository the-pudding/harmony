// Cue data for the story's videos: what the clip shows when, so the docked
// card's list and the map (commit 15) can follow the video.

export type VideoCue = {
	artist: string;
	song: string;
	// The dataset's song key, or null for songs that never made the Billboard
	// top 20 (17 of the examples video's 38).
	songKey: string | null;
	startSeconds: number;
};

const EXAMPLES_SECONDS = 33.218;

// PLACEHOLDER timings: the cues are spread evenly over the clip, not the real
// moments each song starts. Replace `startSeconds` with real timestamps later;
// nothing else needs to change.
const examples = (
	[
		["Journey", "Don't Stop Believing", "journey__dont-stop-believin"],
		["James Blunt", "You're Beautiful", "james-blunt__youre-beautiful"],
		["Alphaville", "Forever Young", null],
		["Jason Mraz", "I'm Yours", "jason-mraz__im-yours"],
		["Mika", "Happy Ending", null],
		["Alex Lloyd", "Amazing", null],
		[
			"The Calling",
			"Wherever You Will Go",
			"the-calling__wherever-you-will-go"
		],
		[
			"Elton John",
			"Can You Feel The Love Tonight",
			"elton-john__can-you-feel-the-love-tonight"
		],
		["Maroon 5", "She Will Be Loved", "maroon-5__she-will-be-loved"],
		["The Last Goodnight", "Pictures Of You", null],
		["U2", "With Or Without You", "u2__with-or-without-you"],
		["Crowded House", "Fall At Your Feet", null],
		["Kasey Chambers", "Not Pretty Enough", null],
		["The Beatles", "Let It Be", "the-beatles__let-it-be"],
		[
			"Red Hot Chili Peppers",
			"Under The Bridge",
			"red-hot-chili-peppers__under-the-bridge"
		],
		["Daryl Braithwaite", "The Horses", null],
		["Bob Marley", "No Woman No Cry", null],
		["Marcy Playground", "Sex And Candy", "marcy-playground__sex-and-candy"],
		["Men At Work", "Land Down Under", "men-at-work__down-under"],
		["Banjo Paterson", "Waltzing Matilda", null],
		["A-ha", "Take On Me", "a-ha__take-on-me"],
		["Green Day", "When I Come Around", null],
		["Eagle Eye Cherry", "Save Tonight", "eagle-eye-cherry__save-tonight"],
		["Toto", "Africa", "toto__africa"],
		["Beyoncé", "If I Were A Boy", "beyonce__if-i-were-a-boy"],
		["The Offspring", "Self Esteem", null],
		["The Offspring", "You're Gonna Go Far, Kid", null],
		["Pink", "You And Your Hand", "p-nk__u-ur-hand"],
		["Lady Gaga", "Poker Face", "lady-gaga__poker-face"],
		["Aqua", "Barbie Girl", "aqua__barbie-girl"],
		["The Fray", "You Found Me", "the-fray__you-found-me"],
		["3OH!3", "Don't Trust Me", "3oh-3__don-t-trust-me"],
		["MGMT", "Kids", null],
		["Tim Minchin", "Canvas Bags", null],
		["Natalie Imbruglia", "Torn", null],
		[
			"Five For Fighting",
			"Superman",
			"five-for-fighting__superman-it-s-not-easy"
		],
		["Axis Of Awesome", "Birdplane", null],
		["Missy Higgins", "Scar", null]
	] as const
).map(
	([artist, song, songKey], i): VideoCue => ({
		artist,
		song,
		songKey,
		startSeconds: (i * EXAMPLES_SECONDS) / 38
	})
);

// Keyed by the stage's `videoId`. Videos without cues (dead-simple) are absent.
export const videoCues: Record<string, VideoCue[]> = { examples };

// The index of the cue showing at `seconds`: the last one that has started
// (the first one before it starts), or -1 when there are no cues. `cues` must
// be sorted by `startSeconds`.
export const cueAt = (
	cues: readonly Pick<VideoCue, "startSeconds">[],
	seconds: number
): number => {
	if (cues.length === 0) return -1;
	let low = 0;
	let high = cues.length - 1;
	while (low < high) {
		const mid = (low + high + 1) >> 1;
		if (cues[mid].startSeconds <= seconds) low = mid;
		else high = mid - 1;
	}
	return low;
};

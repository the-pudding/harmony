const YOUTUBE_SEARCH_BASE_URL = "https://www.youtube.com/results?search_query=";

type YouTubeSearchParams = {
	title: string;
	artist: string;
	year?: number;
};

export const buildYouTubeSearchUrl = ({
	title,
	artist,
	year
}: YouTubeSearchParams): string => {
	const searchParts = [title, artist, ...(year !== undefined ? [String(year)] : [])];
	return `${YOUTUBE_SEARCH_BASE_URL}${encodeURIComponent(searchParts.join(" "))}`;
};

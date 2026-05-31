const YOUTUBE_SEARCH_BASE_URL = "https://www.youtube.com/results?search_query=";

type YouTubeSearchParams = {
	title: string;
	artists: string[];
	year?: number;
};

export const buildYouTubeSearchUrl = ({
	title,
	artists,
	year
}: YouTubeSearchParams): string => {
	const searchParts = [
		title,
		...artists,
		...(year !== undefined ? [String(year)] : [])
	];
	return `${YOUTUBE_SEARCH_BASE_URL}${encodeURIComponent(searchParts.join(" "))}`;
};

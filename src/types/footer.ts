export type StoryFeedItem = {
	url: string;
	short: string;
	hed?: string;
	image?: string;
	[key: string]: unknown;
};

export type StoryRecirc = StoryFeedItem & {
	tease: string;
	slug: string;
	href: string;
};

export type StoryProps = {
	id?: string | number;
	href: string;
	slug: string;
	short?: string;
	tease?: string;
	month?: string;
	bgColor?: string;
	resource?: boolean;
	footer?: boolean;
};

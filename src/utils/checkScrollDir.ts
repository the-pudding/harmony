let prevY = 0;
let scrollDir: "up" | "down" | undefined;

export default function checkScrollDir(scrollY: number | undefined) {
	if (scrollY) {
		scrollDir = scrollY > prevY ? "down" : "up";
		prevY = scrollY;
		return scrollDir;
	}
	scrollDir = undefined;
	return scrollDir;
}

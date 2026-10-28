// Tap along to a video to retime its VTT captions.
// usage: node tasks/vtt-timer.js examples  (uses static/assets/video/examples.{mp4,vtt})
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const name = process.argv[2] || "examples";
if (!/^[\w-]+$/.test(name)) throw new Error(`bad name: ${name}`);

const dir = path.resolve("static/assets/video");
const videoPath = path.join(dir, `${name}.mp4`);
const vttPath = path.join(dir, `${name}.vtt`);
const PORT = 5199;

const page = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>VTT timer: ${name}</title>
<style>
	body { font-family: system-ui, sans-serif; max-width: 760px; margin: 24px auto; padding: 0 16px; background: #111; color: #eee; }
	video { width: 100%; background: #000; }
	.controls { display: flex; gap: 8px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
	button, select { font: inherit; padding: 6px 12px; }
	#tap { display: block; width: 100%; min-height: 96px; font-size: 22px; margin: 12px 0; background: #2d5bd7; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
	#tap:disabled { background: #333; color: #888; cursor: default; }
	ol { padding-left: 24px; }
	li { padding: 4px 0; color: #888; }
	li.done { color: #eee; }
	li.next { color: #8fb0ff; font-weight: 600; }
	.t { font-family: ui-monospace, monospace; font-size: 13px; margin-right: 8px; }
	#status { font-size: 13px; color: #8f8; }
</style>
</head>
<body>
<video id="video" src="/video" controls></video>
<div class="controls">
	<button id="start">▶ Start from 0</button>
	<button id="reset">Reset</button>
	<label>Speed <select id="rate">
		<option value="0.5">0.5×</option>
		<option value="0.75">0.75×</option>
		<option value="1" selected>1×</option>
	</select></label>
	<button id="save">Save to ${name}.vtt</button>
	<span id="status"></span>
</div>
<button id="tap"></button>
<p style="font-size:13px;color:#888">Click the button (or press space) when each line starts. After the last line, one more tap marks its end; otherwise it runs to the end of the video.</p>
<ol id="list"></ol>
<script>
const video = document.getElementById("video");
const tap = document.getElementById("tap");
const list = document.getElementById("list");
const status = document.getElementById("status");

let cues = [];
let idx = 0; // next cue to mark
let lastEnd = null; // explicit end of final cue

const fmt = (s) => {
	const m = Math.floor(s / 60);
	const sec = (s % 60).toFixed(3).padStart(6, "0");
	return String(m).padStart(2, "0") + ":" + sec;
};

const parse = (text) =>
	text.replace(/\\r/g, "").split(/\\n\\n+/).slice(1).filter((b) => b.includes("-->")).map((block) => {
		const lines = block.split("\\n");
		const t = lines.findIndex((l) => l.includes("-->"));
		const [a, b] = lines[t].split("-->").map((x) => toSec(x.trim()));
		return { start: a, end: b, text: lines.slice(t + 1).join("\\n") };
	});

const toSec = (str) => {
	const parts = str.split(" ")[0].split(":").map(Number);
	return parts.reduce((acc, p) => acc * 60 + p, 0);
};

const render = () => {
	list.innerHTML = "";
	cues.forEach((c, i) => {
		const li = document.createElement("li");
		li.className = i < idx ? "done" : i === idx ? "next" : "";
		li.innerHTML = '<span class="t"></span><span class="x"></span>';
		li.querySelector(".t").textContent = fmt(c.start) + " → " + fmt(c.end);
		li.querySelector(".x").textContent = c.text;
		list.appendChild(li);
	});
	// button shows what's on screen right now; each click advances to the next line
	tap.disabled = lastEnd !== null;
	tap.textContent = idx > 0 && lastEnd === null ? cues[idx - 1].text : "";
};

const mark = () => {
	const t = video.currentTime;
	if (idx < cues.length) {
		if (idx > 0) cues[idx - 1].end = t;
		cues[idx].start = t;
		cues[idx].end = video.duration || t + 3;
		idx++;
	} else if (lastEnd === null) {
		lastEnd = t;
		cues[cues.length - 1].end = t;
	}
	status.textContent = "";
	render();
};

const load = async () => {
	cues = parse(await (await fetch("/vtt")).text());
	idx = 0;
	lastEnd = null;
	render();
};

tap.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus off so space doesn't double-fire
tap.addEventListener("click", mark);
window.addEventListener("keydown", (e) => {
	if (e.code === "Space") { e.preventDefault(); if (!tap.disabled) mark(); }
});

document.getElementById("start").onclick = () => {
	video.currentTime = 0;
	video.playbackRate = +document.getElementById("rate").value;
	video.play();
};
document.getElementById("rate").onchange = (e) => (video.playbackRate = +e.target.value);
document.getElementById("reset").onclick = () => { video.pause(); video.currentTime = 0; load(); };
document.getElementById("save").onclick = async () => {
	const body = "WEBVTT\\n\\n" + cues.map((c) => fmt(c.start) + " --> " + fmt(c.end) + "\\n" + c.text).join("\\n\\n") + "\\n";
	const res = await fetch("/vtt", { method: "POST", body });
	status.textContent = res.ok ? "Saved ✓" : "Save failed";
};

load();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
	if (req.url === "/") {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(page);
	} else if (req.url === "/vtt" && req.method === "GET") {
		res.writeHead(200, { "Content-Type": "text/vtt" });
		res.end(fs.readFileSync(vttPath, "utf8"));
	} else if (req.url === "/vtt" && req.method === "POST") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			fs.writeFileSync(vttPath, body);
			console.log(`wrote ${vttPath}`);
			res.end("ok");
		});
	} else if (req.url === "/video") {
		// range support so the video is seekable
		const { size } = fs.statSync(videoPath);
		const range = req.headers.range;
		if (range) {
			const [s, e] = range.replace("bytes=", "").split("-");
			const start = +s;
			const end = e ? +e : size - 1;
			res.writeHead(206, {
				"Content-Range": `bytes ${start}-${end}/${size}`,
				"Accept-Ranges": "bytes",
				"Content-Length": end - start + 1,
				"Content-Type": "video/mp4"
			});
			fs.createReadStream(videoPath, { start, end }).pipe(res);
		} else {
			res.writeHead(200, { "Content-Length": size, "Content-Type": "video/mp4" });
			fs.createReadStream(videoPath).pipe(res);
		}
	} else {
		res.writeHead(404);
		res.end();
	}
});

server.listen(PORT, "127.0.0.1", () => console.log(`VTT timer for ${name}: http://localhost:${PORT}`));

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { $ } from "zx";
import { confirm } from "../../util/flow.js";
import type { Action, ActionOptions } from "../index.js";

const bannedFileExtensions: string[] = [
	[
		[".avi", ".gif", ".gifv", ".mkv", ".mov", ".mp4"],
		[".mpeg", ".mpg", ".mpv", ".ogg", ".ogv", ".webm", ".wmv"],
	], // Videos
	[".heic", "jpeg", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif"], // Images
	[
		[".aac", ".flac", ".m4a", ".m4b", ".mp3", ".ogg"],
		[".oga", ".wav", ".wma", ".webm"],
	], // Audio
].flat(2);

const FILE_PATH_ALLOWED = [
	"/snap/", // I *HATE* Snap.
	"/nvim/", // rule out my added nvim config.
	"/thumbnails/", // rule out thumbnails
	"/.config/google-chrome", // rule out google-chrome
];

// Source: https://www.30secondsofcode.org/js/s/split-array-into-chunks/
// Note: may include an empty extra chunk. I don't want to fix it.
const chunkIntoN = <T>(arr: T[], n: number): T[][] => {
	const size = Math.ceil(arr.length / n);
	return Array.from({ length: n }, (_, i) =>
		arr.slice(i * size, i * size + size)
	);
};

export async function run({ home }: ActionOptions) {
	console.log(
		"This is very slow, and likely will have a lot of output/false positives"
	);
	const shouldContinue = await confirm("continue", true);
	if (!shouldContinue) return true;
	const outfile = path.join(home, "banned-files.txt");
	console.log(
		`Searching for banned files... Output will be logged to ${outfile}.`
	);
	const N = os.availableParallelism();
	const promises = [];
	for (const chunk of chunkIntoN(bannedFileExtensions, N)) {
		if (chunk.length === 0) continue;
		const opts = chunk.flatMap(ext => ["-iname", `*${ext}`, "-o"]);
		opts.pop(); // remove the last -o
		// NOTE: Do *NOT* put an explicit -print here. It will break the output (only prints the last condition).
		promises.push($`find /home ${opts}`.nothrow().quiet());
	}
	const results = await Promise.allSettled(promises);

	const successes = results
		.filter(result => result.status === "fulfilled")
		.map(result => result.value);
	const bannedFiles = successes
		.flatMap(result => result.stdout.split("\n"))
		.filter(Boolean)
		.filter(file => !FILE_PATH_ALLOWED.some(path => file.includes(path)));

	await fs.writeFile(outfile, bannedFiles.join("\n")); // write to log file
	console.log(`Found ${bannedFiles.length} banned files: `);
	const show = await confirm("show them all", true);
	if (show) console.log(bannedFiles.join("\n"));
	return true;
}

export const description = `Automatically (try to) find banned files. SLOW!`;
export default run satisfies Action;

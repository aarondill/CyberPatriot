import { $ } from "zx";
import type { Action } from "../index.js";

const bannedFileExtensions: string[] = [
	[
		[".3g2", ".3gp", ".M2TS", ".MTS", ".TS", ".amv", ".asf"],
		[".avi", ".drc", ".f4a", ".f4b", ".f4p", ".f4v", ".flv", ".gif"],
		[".gifv", ".m2v", ".m4p", ".m4v", ".mkv", ".mng", ".mov", ".mp2", ".mp4"],
		[".mpe", ".mpeg", ".mpg", ".mpv", ".mxf", ".nsv", ".ogg"],
		[".ogv", ".qt", ".rm", ".rmvb", ".roq", ".svi", ".viv", ".vob", ".webm"],
		[".wmv", ".yuv"],
	], // Videos
	[".heic", "jpeg", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif"], // Images
	[
		[".3gp", ".aa", ".aac", ".aax", ".act", ".aiff", ".alac", ".amr", ".ape"],
		[".au", ".awb", ".dss", ".dvf", ".flac", ".gsm", ".iklax", ".ivs", ".m4a"],
		[".m4b", ".m4p", ".mmf", ".movpkg", ".mp3", ".mpc", ".msv", ".nmf"],
		[".ogg", ".oga", ".mogg", ".opus", ".ra", ".rm", ".raw", ".rf64"],
		[".sln", ".tta", ".voc", ".vox", ".wav", ".wma", ".wv"],
		[".webm", ".8svx", ".cda"],
	], // Audio
	[
		[".doc", ".docx", ".html", ".odt", ".pdf", ".xls"],
		[".xlsx", ".ppt", ".pptx", ".txt"],
	], // Documents
].flat(2);

// Source: https://www.30secondsofcode.org/js/s/split-array-into-chunks/
const chunkIntoN = <T>(arr: T[], n: number): T[][] => {
	const size = Math.ceil(arr.length / n);
	return Array.from({ length: n }, (_, i) =>
		arr.slice(i * size, i * size + size)
	);
};

export async function run() {
	const N = 30;
	const promises = [];
	for (const chunk of chunkIntoN(bannedFileExtensions, N)) {
		const opts = chunk
			.flatMap(ext => ["-iname", `*${ext}`, "-o"])
			.with(-1, "-print"); // replace last "-o" with "-print"
		promises.push($`find / ${opts}`.nothrow().quiet());
	}
	const results = await Promise.all(promises);
	const bannedFiles = results.flatMap(result => result.stdout.split("\n"));
	console.log(`Found ${bannedFiles.length} banned files: `, bannedFiles);
}

export const description = `Automatically (try to) find banned files`;
export default run satisfies Action;

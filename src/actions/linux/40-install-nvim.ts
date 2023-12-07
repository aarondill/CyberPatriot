import path from "node:path";
import crypto from "node:crypto";
import type { Action } from "../index.js";
import { downloadFile } from "../../util/file.js";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";

const NEOVIM_REPO = "https://github.com/neovim/neovim";
const NVIM_BIN = "/usr/bin/nvim";

function getReleaseURL(tag: string, filename: string) {
	tag = encodeURIComponent(tag);
	if (filename.includes("/")) {
		const msg = `Invalid filename. filenames may not contain slashes: ${filename}`;
		throw new Error(msg);
	}
	const url = new URL(NEOVIM_REPO);
	// Append /releases/download/<tag>/<filename> to the URL
	url.pathname = path.posix.join(
		url.pathname,
		`/releases/download`,
		tag,
		filename
	);
	return url;
}

function checksumFile(hashName: string, path: string) {
	return new Promise<string>((resolve, reject) => {
		const hash = crypto.createHash(hashName);
		const stream = createReadStream(path);
		stream.on("error", reject);
		stream.on("data", chunk => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}

export async function run() {
	const appimageUrl = getReleaseURL("nightly", "nvim.appimage");
	const appimageShaUrl = getReleaseURL("nightly", "nvim.appimage.sha256sum");

	console.log(`Downloading appimage checksum (${appimageUrl.href})...`);
	const res = await fetch(appimageShaUrl);
	const hashExpected = (await res.text()).split("  ")[0];

	console.log(`Downloading appimage (${appimageUrl.href})...`);
	const appimage = await downloadFile(appimageUrl, NVIM_BIN);

	const hashActual = await checksumFile("sha256", appimage);
	if (hashActual !== hashExpected) {
		throw new Error(
			`Hash mismatch: expected ${hashExpected}, got ${hashActual}`
		);
	}
	// ensure it's executable
	await fs.chmod(NVIM_BIN, 0o775).catch(() => null);
}

export default run satisfies Action;
export const description = "Install neovim from the appimage";

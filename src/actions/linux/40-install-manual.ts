import path from "node:path";
import crypto from "node:crypto";
import type { Action } from "../index.js";
import { downloadFile } from "../../util/file.js";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { $ } from "zx";
import { commandStatus, warn } from "../../util/index.js";

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

async function appimageDeps() {
	const packages = ["libfuse2"];
	console.log("Installing libfuse2 to make appimages work");
	await commandStatus($`add-apt-repository universe`);
	const { exitCode } = await commandStatus($`apt install -- ${packages}`);
	return exitCode === 0;
}
/**
 * type: sha256, filepath: /path/to/file, expected: `9032840413293abee89e file name` (filename is optional)
 */
async function checkChecksum(type: string, filepath: string, expected: string) {
	const hashExpected = expected.split("  ")[0];
	const hashActual = await checksumFile(type, filepath);
	return [hashActual === hashExpected, hashActual];
}

async function getNvim() {
	const appimageUrl = getReleaseURL("nightly", "nvim.appimage");
	const appimageShaUrl = getReleaseURL("nightly", "nvim.appimage.sha256sum");

	console.log(`Downloading appimage checksum (${appimageUrl.href})...`);
	const res = await fetch(appimageShaUrl);
	const hashExpected = await res.text();

	console.log(`Downloading appimage (${appimageUrl.href})...`);
	const appimage = await downloadFile(appimageUrl, NVIM_BIN);
	// ensure it's executable
	await fs.chmod(NVIM_BIN, 0o775).catch(() => null);

	const [matches, actual] = await checkChecksum(
		"sha256",
		appimage,
		hashExpected
	);
	if (matches) {
		warn(`Hash mismatch. Expected ${hashExpected} but got ${actual}`);
		return false;
	}
	return true;
}
export async function run() {
	await getNvim();
	await appimageDeps();
}

export default run satisfies Action;
export const description =
	"Install certain other useful utils (nvim, starship)";

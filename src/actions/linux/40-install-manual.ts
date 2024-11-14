import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { $ } from "zx";
import { downloadFile } from "../../util/file.js";
import { commandStatus, warn } from "../../util/index.js";
import type { Action } from "../index.js";
import type { Parameters } from "tsafe";

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

// Note: this function takes ownership of the file descriptor. It is considered invalid to use it afterwards.
function checksumFile(hashName: string, path: string | number) {
	const args: Parameters<typeof createReadStream> =
		typeof path === "string" ? [path] : ["", { fd: path }];
	return new Promise<string>((resolve, reject) =>
		createReadStream(...args)
			.on("error", reject)
			.pipe(crypto.createHash(hashName))
			.setEncoding("hex")
			.on("data", resolve)
			.on("error", reject)
	);
}

async function appimageDeps() {
	const packages = ["libfuse2"];
	const alreadyInstalled = await $`dpkg-query -s -- ${packages}`
		.nothrow()
		.quiet()
		.stdio("ignore", "ignore", "ignore").exitCode;
	if (alreadyInstalled === 0) return;
	console.log("Installing libfuse2 to make appimages work");
	await commandStatus($`add-apt-repository universe`);
	const { exitCode } = await commandStatus($`apt install -- ${packages}`);
	return exitCode === 0;
}
/**
 * type: sha256, filepath: /path/to/file, expected: `9032840413293abee89e file name` (filename is optional)
 */
async function checkChecksum(type: string, filepath: string, expected: string) {
	const hashExpected = expected.split(/\s+/)[0];
	const hashActual = await checksumFile(type, filepath);
	return [hashActual === hashExpected, hashActual, hashExpected] as const;
}

async function getNvim() {
	const appimageUrl = getReleaseURL("nightly", "nvim.appimage");
	const appimageShaUrl = getReleaseURL("nightly", "nvim.appimage.sha256sum");

	console.log(`Downloading appimage checksum (${appimageUrl.href})...`);
	const res = await fetch(appimageShaUrl);
	const hashFileContent = await res.text();

	console.log(`Downloading appimage (${appimageUrl.href})...`);
	const appimage = await downloadFile(appimageUrl, NVIM_BIN);
	// ensure it's executable
	await fs.chmod(NVIM_BIN, 0o775).catch(() => null);

	const [matches, actual, hashExpected] = await checkChecksum(
		"sha256",
		appimage,
		hashFileContent
	);
	if (!matches) {
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

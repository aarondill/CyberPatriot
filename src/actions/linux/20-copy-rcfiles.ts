import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { id } from "tsafe";
import { $, which } from "zx";
import type { YamlConfig } from "../../config.js";
import { fileExists, openFile, walk } from "../../util/file.js";
import { backup, commandStatus, error, warn } from "../../util/index.js";
import { egid, euid } from "../../util/root.js";
import { isNodeError } from "../../util/types.js";
import type { Action, ActionOptions } from "../index.js";

async function updateCopy(home: string, root: string, rcfiles: string) {
	if (!(await fileExists(rcfiles))) {
		const filepath = path.relative(root, rcfiles);
		const msg = `Could not find rc files directory. Please ensure ${filepath} exists in the project root.`;
		throw new Error(msg);
	}
	for await (const file of walk(rcfiles)) {
		const dest = path.join(home, path.relative(rcfiles, file));
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await backup(dest);
		const err = await fs.copyFile(file, dest).catch(id<unknown>);
		if (err) {
			if (!isNodeError(err)) throw err as unknown;
			error(`Could not copy file '${file}': ${err.message}`);
		}
	}
}

async function installPackages(...packages: string[]) {
	if (packages.length === 0) return; // If no packages are specified, do nothing.
	const apt = await which("apt", { nothrow: true });
	if (!apt) {
		const thisfile = path.basename(fileURLToPath(import.meta.url));
		return error(
			`Could not find apt! ${thisfile} currently only works on debian-based systems!`
		);
	}
	await commandStatus($`apt install -- ${packages}`);
}

async function getOSID() {
	// ID= Examples: "ID=fedora", "ID=debian".
	// A lower-case string (no spaces or other characters outside of 0–9, a–z, ".",
	// "_" and "-") identifying the operating system, excluding any version information
	// and suitable for processing by scripts or usage in generated filenames.
	// If not set, a default of "ID=linux" may be used.
	// Note that even though this string may not include characters that require
	// shell quoting, quoting may nevertheless be used.
	const id = await openFile("/etc/os-release", "r", async fd => {
		for await (const line of fd.readLines()) {
			if (!line.trim().startsWith("ID=")) continue;

			const value = line.trim().split("=")[1];
			// Remove quotes from outside if present
			if (`'"`.includes(value.charAt(0))) return value.slice(1, -1);
			return value;
		}
	});
	return id ?? "linux";
}

async function handlePackages({ packages }: YamlConfig) {
	const osid = await getOSID();
	if (!packages) return true;
	const packageList = [];
	const distro = packages[osid];
	if (packages["*"]) packageList.push(...packages["*"]);
	if (distro) packageList.push(...distro);

	const suc = await installPackages(...packageList);
	if (suc === false) return false;
}

async function isGitRepo(path: string) {
	const stat = await fs.stat(path).catch(() => null);
	if (!stat) return false;
	if (!stat.isDirectory()) return false;
	const { exitCode } = await $`git -C ${path} rev-parse`.quiet().nothrow();
	return exitCode === 0;
}

async function handleClone(home: string, { clone }: YamlConfig) {
	if (!clone) return;
	const entries = Object.entries(clone);
	if (entries.length === 0) return; // empty object, return

	const git = await which("git", { nothrow: true });
	if (!git) return error(`Could not find git! git is required to clone repos!`);

	for (const [tpath, options] of entries) {
		// Permit tilde-expansion of the path.
		const tildeReplaced = tpath.startsWith("~/")
			? path.join(home, tpath.slice(2))
			: tpath;
		// if path is relative, it's relative to home
		const filepath = path.resolve(home, tildeReplaced);

		// eslint-disable-next-line prefer-const
		let { url, args } = options ?? {};
		if (!url) {
			warn(`url is missing in clone config (${filepath}). Ignoring...`);
			continue;
		}
		args ??= [];
		// Already exists *and* is a git repo
		if (await isGitRepo(filepath)) continue;

		await commandStatus($`${git} clone ${args} -- ${url} ${filepath}`);
		// Make sure that the repo has the right owner.
		await commandStatus($`chown -R ${euid}:${egid} -- ${filepath}`);
	}
}

export async function run({ root, home, config }: ActionOptions) {
	const rcfiles = path.join(root, "files", "rc");
	await updateCopy(home, root, rcfiles);
	// Install the listed packages!
	const packagesRes = await handlePackages(config);
	if (packagesRes === false) return false;
	const cloneRes = await handleClone(home, config);
	if (cloneRes === false) return false;
}
export default run satisfies Action;
export const description = "Copy common config to the VM and install packages.";

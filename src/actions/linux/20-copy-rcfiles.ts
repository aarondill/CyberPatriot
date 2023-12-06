import { error, warn } from "../../util/index.js";
import type { Action } from "../index.js";
import { id } from "tsafe";
import { fileExists, findFile, openFile, walk } from "../../util/file.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { egid, euid, getHome } from "../../util/root.js";
import { isNodeError } from "../../util/types.js";
import yaml from "yaml";
import { isNativeError } from "node:util/types";
import { $, which } from "zx";

async function updateCopy(home: string, root: string, rcfiles: string) {
	if (!(await fileExists(rcfiles))) {
		const filepath = path.relative(root, rcfiles);
		const msg = `Could not find rc files directory. Please ensure ${filepath} exists in the project root.`;
		throw new Error(msg);
	}
	for await (const file of walk(rcfiles)) {
		const dest = path.join(home, path.relative(rcfiles, file));
		await fs.mkdir(path.dirname(dest), { recursive: true });
		const err = await fs.copyFile(file, dest).catch(id<unknown>);
		if (err) {
			if (!isNodeError(err)) throw err as unknown;
			error(`Could not copy file '${file}': ${err.message}`);
		}
	}
}

type CloneOptions = {
	url: string;
	// Options for the git clone command.
	args?: null | string[];
};
type RcYaml = Partial<{
	packages?: null | {
		// Special case
		"*"?: null | string[];
		// id parsed from /etc/os-release
		[id: string]: undefined | null | string[];
	};
	clone?: null | {
		[path: string]: undefined | null | CloneOptions;
	};
}>;

export async function parseYaml(rc: string): Promise<object | undefined> {
	const content = await fs.readFile(rc, { encoding: "utf8" }).catch(e => {
		if (!isNodeError(e)) throw e;
		return null;
	});
	if (!content) return; // file didn't exist (or not readable)
	let config;
	try {
		config = yaml.parse(content) as unknown;
	} catch (e) {
		const err = isNativeError(e) ? e.message : String(e);
		error(`Could not parse yaml file '${rc}': ${err}`);
		return;
	}

	if (!config) return; // empty file
	if (typeof config !== "object") {
		warn(`${rc} contains only a scalar. Ignoring...`);
		return;
	}

	return config;
}

async function installPackages(...packages: string[]) {
	const apt = await which("apt", { nothrow: true });
	if (!apt) {
		const thisfile = path.basename(fileURLToPath(import.meta.url));
		return error(
			`Could not find apt! ${thisfile} currently only works on debian-based systems!`
		);
	}
	const { exitCode } = await $`apt install -- ${packages}`.nothrow();
	if (exitCode !== 0) warn("command failed!");
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

export async function run() {
	const home = getHome();
	const thisfile = fileURLToPath(import.meta.url);
	const root = await findFile("package.json", path.dirname(thisfile));
	if (!root) throw new Error("Could not find root directory");
	const rcfiles = path.join(root, "files", "rc");
	await updateCopy(home, root, rcfiles);

	const rcyaml = path.join(root, "files", "rc.yaml");
	const config = (await parseYaml(rcyaml)) as RcYaml; // just assert it. I don't feel like doing this right now.
	if (!config) return;
	const id = await getOSID();
	const { packages, clone } = config;
	// Install the listed packages!
	if (packages) {
		const packageList = [];
		const distro = packages[id];
		if (packages["*"]) packageList.push(...packages["*"]);
		if (distro) packageList.push(...distro);

		const suc = await installPackages(...packageList);
		if (suc === false) return false;
	}

	for (const [tpath, options] of Object.entries(clone ?? {})) {
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
		args.push("--filter=tree:0");
		// Already exists *and* is a git repo
		if ((await $`git -C ${filepath} rev-parse`.exitCode) === 0) continue;
		const { exitCode } =
			await $`git clone ${args} -- ${url} ${filepath}`.nothrow();
		if (exitCode !== 0) warn(`command failed!`);
		// Make sure that the repo has the right owner.
		await $`chown -R ${euid}:${egid} -- ${filepath}`.nothrow();
	}
}
export default run satisfies Action;
export const description = "Copy common config to the VM and install packages.";

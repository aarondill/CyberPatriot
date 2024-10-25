import fs from "node:fs/promises";
import { $, echo, which } from "zx";
import {
	backup,
	confirm,
	error,
	getApt,
	isProcessOutput,
	mapFile,
} from "../../util/index.js";
import type { Action } from "../index.js";

// NOTE: because euid is changed, not uid, child processes are spawned as root!

async function updateApt() {
	const apt = await getApt();
	if (!apt) return error("Could not find apt!");
	if (!(await confirm(`update the system (${apt})`, true))) return true;
	try {
		await $`${apt} update`;
		await $`${apt} upgrade`;
	} catch (err) {
		if (!isProcessOutput(err)) throw err;
		echo("Command failed! " + err.message);
		return false;
	}
}

// TODO: make this work with debian
const repoRegex = /^(#\s*)?deb http/;
async function fixApt() {
	const sources = await fs
		.readdir("/etc/apt/sources.list.d/")
		.catch(() => null);
	if (sources && sources.length > 0) {
		echo(`Note: /etc/apt/sources.list.d/ contains ${sources.length} items:`);
		for (const source of sources) {
			echo(source);
		}
	}
	await backup("/etc/apt/sources.list");
	await mapFile("/etc/apt/sources.list", line => {
		line = line.trim().replaceAll(/(\s){2,}/g, "$1"); // collapse whitespace
		if (line === "") return line;
		if (line.startsWith("deb cdrom:")) return `# ${line}`;
		// Note the trailing space!
		// Remove comment and whitespace
		if (line.match(repoRegex))
			return line.startsWith("#") ? line.replace(/^#+ /, "") : line;

		if (line.startsWith("#")) return line; // keep comments
		return `# ${line}`; // Comment all other entries
	});

	return await updateApt();
}

export const description = "Fix apt sources and update the system";
export const run = fixApt satisfies Action;
export default fixApt satisfies Action;

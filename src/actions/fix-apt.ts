import fs from "node:fs/promises";
import { $, echo, which } from "zx";
import type { Action } from "./index.js";
import { error, isProcessOutput } from "../util/init.js";
import { isWindows } from "../util/constants.js";
import backup, { mapFile } from "../util/backup.js";
import { useRoot } from "../util/root.js";

// NOTE: because euid is changed, not uid, child processes are spawned as root!

async function updateApt(apt: string) {
	echo("Running apt update");
	try {
		await $`${apt} update`;
		await $`${apt} upgrade`;
	} catch (err) {
		if (!isProcessOutput(err)) throw err;
		echo("Command failed! " + err.message);
		return false;
	}
}

async function fixApt() {
	if (isWindows) return true; // on windows this is a noop
	const apt = await which("apt", { nothrow: true });
	if (!apt) return error("Could not find apt!");

	const sources = await fs
		.readdir("/etc/apt/sources.list.d/")
		.catch(() => null);
	if (sources && sources.length > 0) {
		echo(`Note: /etc/apt/sources.list.d/ contains ${sources.length} items:`);
		for (const source of sources) {
			echo(source);
		}
	}
	await useRoot(backup, "/etc/apt/sources.list");
	await useRoot(mapFile, "/etc/apt/sources.list", line => {
		line = line.trim().replaceAll(/(\s){2,}/g, "$1"); // collapse whitespace
		if (line === "") return line;
		if (line.startsWith("deb cdrom:")) return `# ${line}`;
		// Note the trailing space!
		// Remove comment and whitespace
		if (line.match(/^(#%s*)?deb https:\/\/.*\.ubuntu\.com\/ubuntu /))
			return line.startsWith("#") ? line.replace(/^# /, "") : line;

		if (line.startsWith("#")) return line; // keep comments
		return `# ${line}`; // Comment all other entries
	});

	return await updateApt(apt);
}

export const run = fixApt satisfies Action;
export default fixApt satisfies Action;

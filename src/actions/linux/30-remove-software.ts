import { $ } from "zx";
import { confirm, error } from "../../util/flow.js";
import type { Action } from "../index.js";
import { getApt } from "../../util/constants.js";
const commonProhibitedSoftware = ["ophcrack", "wireshark", "aisleriot"];

export async function run() {
	const apt = await getApt();
	if (!apt) return error("Could not find apt!");
	for (const p of commonProhibitedSoftware) {
		const { exitCode } = await $`dpkg-query -s -- ${p}`
			.nothrow()
			.quiet()
			.stdio("ignore", "ignore", "ignore");
		if (exitCode !== 0) continue; // This is not installed
		if (!(await confirm(`remove the ${p} package?`, true))) continue;
		await $`${apt} autopurge -- ${p}`;
	}
	return true;
}

export const description = `Purge commonly prohibited software.`;
export default run satisfies Action;

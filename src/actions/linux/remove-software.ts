import { $ } from "zx";
import type { Action } from "../index.js";
import { isWindows } from "../../util/constants.js";
import { confirm } from "../../util/flow.js";
const commonProhibitedSoftware = ["ophcrack", "wireshark"];

export async function run() {
	for (const p of commonProhibitedSoftware) {
		const { exitCode } = await $`dpkg-query -s -- ${p}`
			.nothrow()
			.quiet()
			.stdio("ignore", "ignore", "ignore");
		if (exitCode !== 0) continue; // This is not installed
		if (!(await confirm(`Would you like to remove the ${p} package?`, true)))
			continue;
		await $`apt autopurge -- ${p}`;
	}
	return true;
}

export default run satisfies Action;

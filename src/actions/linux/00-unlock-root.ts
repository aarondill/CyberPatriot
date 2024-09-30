import { $ } from "zx";
import { warn } from "../../util/flow.js";
import type { Action } from "../index.js";

export async function run() {
	console.log("Updating root password...");
	const { exitCode } = await $`passwd root`.nothrow();
	if (exitCode !== 0) warn("Command failed.");
}

export default run satisfies Action;
export const description = "Unlock/update root password.";

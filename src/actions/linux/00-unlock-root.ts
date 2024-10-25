import { $ } from "zx";
import type { Action } from "../index.js";
import { commandStatus } from "../../util/index.js";

export async function run() {
	console.log("Updating root password...");
	await commandStatus($`passwd root`);
}

export default run satisfies Action;
export const description = "Unlock/update root password.";

import { assert } from "tsafe";
import { $, which } from "zx";
import type { Action } from "../index.js";
import { getApt } from "../../util/constants.js";
import { error } from "../../util/flow.js";

export async function run() {
	let ufw = await which("ufw", { nothrow: true });
	if (!ufw) {
		console.log("ufw not found. Installing via apt...");
		const apt = await getApt();
		if (!apt) return error("Could not find apt!");
		await $`${apt} install ufw`;
		ufw = await which("ufw", { nothrow: true });
	}
	assert(ufw, "ufw not found");
	console.log("Enabling firewall...");
	await $`${ufw} enable`;
}
export const description = `Enable the firewall`;
export default run satisfies Action;

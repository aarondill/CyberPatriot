import fs from "fs/promises";
import type { Action, ActionOptions } from "../index.js";

export async function run({}: ActionOptions) {
	const lines = (await fs.readFile("/etc/ssh/sshd_config", "utf8")).split("\n");
	const offending = lines.findIndex(line =>
		line.trim().startsWith("PermitRootLogin")
	);
	if (offending !== -1) {
		lines[offending] = "PermitRootLogin no";
		await fs.writeFile("/etc/ssh/sshd_config", lines.join("\n"));
	}
}
export default run satisfies Action;
export const description = "Set sshd_config PermitRootLogin=no";

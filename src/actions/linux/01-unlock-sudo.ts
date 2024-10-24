import fs from "node:fs/promises";
import type { Action, ActionOptions } from "../index.js";

export async function run({ userInfo }: ActionOptions) {
	const { username } = userInfo;
	console.log(`Unlocking sudo for user '${username}'...`);
	await fs.writeFile(
		"/etc/sudoers.d/cyberpatriot",
		`${username} ALL=NOPASSWD:SETENV: ALL`
	);
}

export default run satisfies Action;
export const description = "Passwordless sudo for the current user";

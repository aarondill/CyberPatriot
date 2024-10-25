import { which } from "zx";

export const isWindows = process.platform === "win32";

// An array of commands that can be used the same as apt
export const APT_CMDS = ["nala", "apt", "apt-get"];
export async function getApt() {
	// find a viable apt command
	let apt = null;
	for (const cmd of APT_CMDS)
		if ((apt = await which(cmd, { nothrow: true }))) break;
	return apt;
}

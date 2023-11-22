import fs from "node:fs/promises";
import { $ } from "zx";
import { isWindows } from "./contants.js";

// TODO: Test this!
async function isVMWindows() {
	if (!isWindows)
		throw new Error("isVMWindows called on a non-Windows platform");
	// Do we need echo here?
	const p = await $`(gwmi Win32_BaseBoard).Manufacturer`;
	if (p.exitCode !== 0) return false;
	return p.stdout.trim() === "Microsoft Corporation";
}
async function isVMUnix() {
	if (isWindows) throw new Error("isVMUnix called on Windows");
	// check for 'hypervisor'
	let ret = false;
	let fd;
	try {
		fd = await fs.open("/proc/cpuinfo", "r");
		for await (let line of fd.readLines()) {
			if (!line.startsWith("flags")) continue;
			// Stop processing the file!
			line = line.substring(line.indexOf(":")); // remove `flags .*:`
			line += " "; // Add a space to the end
			ret = line.includes(" hypervisor "); // check for hypervisor (not a substring, spaces!)
		}
	} finally {
		await fd?.close();
	}
	return ret;
}

// This function performs file operations. You should probably cache it!
// This may have false positives, so don't rely on it for anything wihtout user input
export async function isVM(): Promise<boolean> {
	return await (isWindows ? isVMWindows() : isVMUnix());
}

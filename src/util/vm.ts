import { $ } from "zx";
import { isWindows } from "./constants.js";
import { openFile } from "./index.js";

// TODO: Test this!
async function isVMWindows() {
	if (!isWindows)
		throw new Error("isVMWindows called on a non-Windows platform");
	// Do we need echo here?
	const p = await $`(gwmi Win32_BaseBoard).Manufacturer`.nothrow();
	if (p.exitCode !== 0) return false;
	return p.stdout.trim() === "Microsoft Corporation";
}
async function isVMUnix() {
	if (isWindows) throw new Error("isVMUnix called on Windows");
	// check for 'hypervisor'
	return await openFile("/proc/cpuinfo", "r", async fd => {
		for await (let line of fd.readLines()) {
			if (!line.startsWith("flags")) continue;
			line = line.substring(line.indexOf(":")); // remove `flags .*:`
			line += " "; // Add a space to the end
			return line.includes(" hypervisor "); // check for hypervisor (not a substring, spaces!)
		}
		return false;
	});
}

// This function performs file operations. You should probably cache it!
// This may have false positives, so don't rely on it for anything wihtout user input
export async function isVM(): Promise<boolean> {
	return await (isWindows ? isVMWindows() : isVMUnix());
}

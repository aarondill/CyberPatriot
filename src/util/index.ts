export * from "./pstdin.js";
export * from "./file.js";
export * from "./flow.js";
export * from "./vm.js";
export * from "./constants.js";
export * from "./backup.js";
export * from "./root.js";
export * from "./types.js";

import { spawn, type SpawnOptions } from "node:child_process";
import type { ProcessPromise } from "zx";
import { ProcessOutput } from "zx";
import { warn } from "./flow.js";

export const run = (args: readonly string[], options?: SpawnOptions) =>
	spawn(args[0], args.slice(1), options ?? {});

export async function commandStatus(
	command: ProcessPromise | ProcessOutput
): Promise<ProcessOutput> {
	const output =
		command instanceof ProcessOutput ? command : await command.nothrow().run();
	if (output.exitCode !== 0) warn("Command failed!");
	return output;
}

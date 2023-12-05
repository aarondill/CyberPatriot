export * from "./pstdin.js";
export * from "./file.js";
export * from "./flow.js";
export * from "./vm.js";
export * from "./constants.js";
export * from "./backup.js";
export * from "./root.js";
export * from "./types.js";

import { spawn, type SpawnOptions } from "node:child_process";

export const run = (args: readonly string[], options?: SpawnOptions) =>
	spawn(args[0], args.slice(1), options ?? {});

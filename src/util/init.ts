export * from "./pstdin.js";
export * from "./flow.js";

import { ProcessOutput } from "zx";
import { spawn, type SpawnOptions } from "node:child_process";
import type { PathLike } from "node:fs";

export function isProcessOutput(err: unknown): err is ProcessOutput {
	return err instanceof ProcessOutput;
}

export function isNodeError(value: unknown): value is NodeJS.ErrnoException {
	if (!(value instanceof Error)) return false;
	if ("code" in value && typeof value.code !== "string") return false; // code?: string | undefined;
	if ("path" in value && typeof value.path !== "string") return false; // path?: string | undefined;
	if ("syscall" in value && typeof value.syscall !== "string") return false; // syscall?: string | undefined;
	if ("errno" in value && typeof value.errno !== "number") return false; // errno?: number | undefined;
	return true;
}
export const isPathLike = (x: unknown): x is PathLike =>
	typeof x === "string" || x instanceof Buffer || x instanceof URL;

export const run = (args: readonly string[], options?: SpawnOptions) =>
	spawn(args[0], args.slice(1), options ?? {});

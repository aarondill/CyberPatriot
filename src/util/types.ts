import type { PathLike } from "node:fs";
import { isModuleNamespaceObject } from "node:util/types";
import { assert } from "tsafe";
import { ProcessOutput } from "zx";

/** Create a callback that always returns val */
export const CB =
	<T>(val: T) =>
	() =>
		val;
/** A callback that always returns null */
export const NULLCB = CB(null);
/** A callback that always returns true */
export const TRUECB = CB(true);
/** A callback that always returns false */
export const FALSECB = CB(false);

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

export type ModuleNamespaceObject = Record<string, unknown>;
export function assertDynamicImport(
	module: unknown
): asserts module is ModuleNamespaceObject {
	const msg =
		"import() returned non-object. This should be impossible. Is there a then() method?";
	assert(isModuleNamespaceObject(module), msg);
}

export function isEmptyObj(obj: object): obj is Record<string, never> {
	for (const prop in obj) {
		if (Object.hasOwn(obj, prop)) {
			return false;
		}
	}

	return true;
}

export type Nullable<T> = T | null | undefined;
/**
Makes all values in an object nullable, recusively.
Arrays are considered a single value.
*/
export type DeepNullable<T> = T extends unknown[]
	? Nullable<T>
	: T extends object
		? Nullable<{ [K in keyof T]?: DeepNullable<T[K]> }>
		: Nullable<T>;

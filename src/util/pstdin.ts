import type { Readable } from "stream";
import fs from "node:fs";
import { type ProcessPromise } from "zx";
import { isNodeError, isPathLike } from "./index.js";
import type { PathLike } from "fs";

type StdIn = ProcessPromise["stdin"];
type PipeOpts = { end?: boolean };
export interface ChainableStdin {
	end: (s?: string) => ProcessPromise;
	write: (s: string) => ChainableStdin;
	// Same as write, but writes a newline to the output.
	writeln: (s: string) => ChainableStdin;
	on: (...args: Parameters<StdIn["on"]>) => ChainableStdin;
	off: (...args: Parameters<StdIn["off"]>) => ChainableStdin;
	once: (...args: Parameters<StdIn["once"]>) => ChainableStdin;
	// Note: opts are only used with a Readable. ProcessPromise will ignore them.
	// Handle multiple yourself.
	// If PathLike is passed, it will be converted to a stream using fs.createReadStream, then read and closed.
	pipe(
		src: ProcessPromise | Readable | PathLike,
		opts?: PipeOpts
	): ProcessPromise;
	stream: StdIn;
	// Don't use this unless you know what you're doing. It's better to call `end` and get the process back that way.
	process: ProcessPromise;
}

// A set of Promises that have a `stdin` handler. This is used to ensure that only one handler is set at a time.
const _hasHandler = new WeakSet<ProcessPromise>();
/**
 * Get Process Stdin
 * Gracefully handle errors while writting to stdin of p
 */
export function pstdin(p: ProcessPromise): ChainableStdin {
	const { stdin } = p;
	if (!_hasHandler.has(p)) {
		_hasHandler.add(p);
		stdin.on("error", err => {
			if (!isNodeError(err)) throw err;
			if (err.code === "EPIPE") return stdin.end();
			if (stdin.listenerCount("error") === 1) throw err; // We're the only listener, just throw it.
			return; // Don't throw because other handlers might catch it.
		});
	}
	const ret: ChainableStdin = {
		end: s => (stdin.end(s), p), // Returns process
		write: s => (stdin.write(s), ret), // returns chainable
		writeln: s => (s && stdin.write(s), stdin.write("\n"), ret),
		on: (...args) => (stdin.on(...args), ret),
		off: (...args) => (stdin.off(...args), ret),
		once: (...args) => (stdin.once(...args), ret),
		pipe: (src, opts) => {
			if (isPathLike(src)) src = fs.createReadStream(src);
			void src.pipe(stdin, opts);
			return p;
		},
		stream: stdin,
		process: p,
	};
	return ret;
}

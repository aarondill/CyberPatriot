import { Readable } from "stream";
import { isProcessOutput, pstdin } from "./util/index.js";
import os from "node:os";
import { echo, $ } from "zx";

export async function tryCatch() {
	try {
		await $`exit 1`;
	} catch (p) {
		if (!isProcessOutput(p)) throw p;
		console.log(`Exit code: ${p.exitCode}`);
		console.log(`Error: ${p.stderr}`);
	}
}
export async function getStdout() {
	const p = $`printf '%s\\n' hello world`.quiet();
	for await (const chunk of p.stdout) {
		echo(chunk);
	}
}

export async function getStdoutDone() {
	const p = await $`printf '%s\\n' hello world`.quiet();
	echo(p.stdout);
}

export async function writeStdin() {
	await pstdin($`while read line; do echo "$line"; done`)
		.writeln("Hello, World!")
		.writeln("Goodbye, World!")
		.end();
}
export async function pipeStdin() {
	await $`echo ${os.homedir()}`.quiet().pipe($`cat`);
	// OR:
	await pstdin($`cat`).pipe($`echo ${os.homedir()}`.quiet());
}
export async function pipeStdinReadable() {
	function* gen() {
		yield "One line\n";
		yield "Another line\n";
	}
	const readableStream = Readable.from(gen(), { encoding: "utf8" });
	await pstdin($`cat`).pipe(readableStream);
}

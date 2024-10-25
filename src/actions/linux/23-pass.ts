import fs from "fs/promises";
import type { Action } from "../index.js";
const findLine = (lines: string[], prop: string) =>
	lines.findIndex(line => (line.match(/^\s*(\S+)\s*/) ?? [])[1] === prop);

export async function run() {
	const lines = (await fs.readFile("/etc/login.defs", "utf8")).split("\n");
	const maxDaysLineI = findLine(lines, "PASS_MAX_DAYS");
	lines[maxDaysLineI === -1 ? lines.length : maxDaysLineI] = `PASS_MAX_DAYS\t5`;
	const minDaysLineI = findLine(lines, "PASS_MIN_DAYS");
	lines[minDaysLineI === -1 ? lines.length : minDaysLineI] = `PASS_MIN_DAYS\t1`;
	await fs.writeFile("/etc/login.defs", lines.join("\n"));
}
export const description = `Set password policies in /etc/login.defs`;
export default run satisfies Action;

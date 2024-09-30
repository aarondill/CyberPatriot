import fs from "fs/promises";
import type { Action } from "../index.js";
const findLine = (lines: string[], prop: string) =>
	lines.findIndex(line => (line.match(/^\s*#?\s*(\S+)\s*/) ?? [])[1] === prop);

export async function run() {
	const lines = (await fs.readFile("/etc/login.defs", "utf8")).split("\n");
	const maxDaysLineI = findLine(lines, "PASS_MAX_DAYS");
	if (maxDaysLineI !== -1) lines[maxDaysLineI] = `PASS_MAX_DAYS 5`;
	const minDaysLineI = findLine(lines, "PASS_MIN_DAYS");
	if (minDaysLineI !== -1) lines[minDaysLineI] = `PASS_MIN_DAYS 1`;
}
export const description = `Set password policies in /etc/login.defs`;
export default run satisfies Action;

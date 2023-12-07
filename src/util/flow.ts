import { question, chalk } from "zx";
import type { Nullable } from "./types.js";
export async function confirm(
	what: string,
	defaultResponse = false
): Promise<boolean> {
	const choices = ["yes", "no"]; // Note: This order cannot change! The below index relies on it.
	const shortOptions = choices.map(s => s.charAt(0));
	const i = +!defaultResponse; // 0 or 1 -- Index of the default response
	shortOptions[i] = shortOptions[i].toUpperCase();

	if (what.trimEnd().endsWith("?")) what = what.trimEnd().slice(0, -1);
	const msg = `Do you want to ${what}? (${shortOptions.join("/")}) `;
	const res = await question(msg, {
		choices: choices.concat(choices.map(s => s.toUpperCase())),
	});

	const lres = res.toLowerCase().trim();
	if (lres === "") return defaultResponse;
	// Yes or y are true, anything else is considered no.
	return lres === "yes" || lres === "y";
}

/**
 * Support $NO_COLOR
 * usage: where you would write: `chalk.bold.red(msg)`, instead use `colors(chalk.bold.red, msg)`
 */
export function colors(chalkFunc: (arg0: string) => string, s: string) {
	if (process.env.NO_COLOR && process.env.NO_COLOR.trim() !== "") return s;
	return chalkFunc(s);
}

export function warn(s: string): false {
	console.error(colors(chalk.bold.yellowBright, s));
	return false;
}
export function error(s: string): false {
	console.error(colors(chalk.bold.red, s));
	return false;
}
// Note: This does not exit the process! Make sure you return after this!
export function abort(msg?: string | null, code?: number | null): number {
	error(msg ? `Aborting: ${msg}` : "Aborting");
	process.exitCode = code ?? 1;
	return code ?? 1;
}

export function getURL(
	prompt: Nullable<string>,
	nullPermitted: false
): Promise<URL>;
export function getURL(
	prompt?: Nullable<string>,
	nullPermitted?: Nullable<true>
): Promise<URL | null>;
export async function getURL(
	prompt?: Nullable<string>,
	nullPermitted?: Nullable<boolean>
) {
	prompt ??= "Enter a URL:";
	nullPermitted ??= true;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const url = await question(prompt);
		if (!url && nullPermitted) return null;

		if (URL.canParse(url)) return new URL(url);
		console.warn("Invalid URL, please check your spelling and try again.");
	}
}

function main(args: string[]): number | null | undefined {
	return args.length;
}
process.exit(main(process.argv.slice(2)) ?? 0);

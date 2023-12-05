export type YeildValueFunction<T> = (value: T) => Promise<void>;
/**
 * // Usage:
 *  const gen = createGeneratorFromCallback(
 *    async (yeildVal: YeildValueFunction<number>) => {
 *      let i = 0;
 *      while (i < Infinity) {
 *        await yeildVal(i++);
 *      }
 *    }
 *  );
 *  for await (const num of gen) console.log(num);
 */
export async function* createGeneratorFromCallback<
	Yield,
	Args extends unknown[],
	Ret = Yield,
>(
	cb: (yeild: (v: Yield) => Promise<void>, ...args: Args) => PromiseLike<Ret>,
	...args: Args
): AsyncGenerator<Yield, Ret> {
	let _resolve: (value: Yield) => void, // Return callback
		_value = new Promise<Yield>(res => (_resolve = res)); // a promise that will resolve to the yeild value
	let _resolveYeild: () => void = () => {},
		_yeild = new Promise<void>(res => (_resolveYeild = res)); // a promise that will resolve when the value has been yeild
	let done = false;

	const yeildVal: YeildValueFunction<Yield> = async v => {
		_resolve(v); // Resolve the value
		await _yeild; // wait until the value has been used.
		_yeild = new Promise<void>(res => (_resolveYeild = res)); // set up new yeild promise
		_value = new Promise(res => (_resolve = res)); // set up new value promise
	};

	// Get a promise that resolves when the function is done.
	const res = cb(yeildVal, ...args).then((v: Ret) => {
		done = true;
		return v;
	});

	// This is fine. it will be changed in the above `.then()`
	// eslint-disable-next-line no-unmodified-loop-condition
	while (!done) {
		yield _value; // yeild the value promise
		_resolveYeild(); // mark the yeild promise as used -- allow _value to be changed in yeildVal
	}
	return await res;
}

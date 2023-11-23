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
	let _resolve: (value: Yield) => void,
		_value = new Promise<Yield>(res => (_resolve = res));
	let done = false;

	const yeildVal: YeildValueFunction<Yield> = async v => {
		_resolve(v);
		await _value;
		_value = new Promise(res => (_resolve = res));
	};
	const res = cb(yeildVal, ...args).then((v: Ret) => {
		done = true;
		return v;
	});

	// This is fine. it will be changed in the above `.then()`
	// eslint-disable-next-line no-unmodified-loop-condition
	while (!done) {
		yield _value;
	}
	return await res;
}

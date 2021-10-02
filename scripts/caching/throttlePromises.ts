/** Need to implement b/c ie doesn't support */
class IterableIterator<T> {
    constructor(
        public hasNext: () => boolean,
        public next: () => T,
    ) {}
}

function batchGenerator<T>(
    promiseGenerator: IterableIterator<Promise<T>>,
    batchsize: number,
): IterableIterator<Promise<T>[]> {
    return new IterableIterator<Promise<T>[]>(
        () => promiseGenerator.hasNext(),
        () => {
            const arr: Promise<T>[] = [];
            while (promiseGenerator.hasNext()) {
                arr.push(promiseGenerator.next());
                if (arr.length >= batchsize) {
                    return arr;
                }
            }
            return arr;
        }
    );
}

/** It is important to only create the promises as needed by the generator or they will all run at once */
export function throttlePromises<A, T>(arr: A[], convert: (val: A) => Promise<T>, batchsize: number): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
        const promiseGenerator = createPromiseGenerator(arr, convert);
        const batcher = batchGenerator(promiseGenerator, batchsize);
        const results: T[] = [];
        function queueNext() {
            if (batcher.hasNext()) {
                Promise.all(batcher.next()).then(
                    vals => {
                        results.push(...vals);
                        queueNext();
                    },
                    error => { reject(error); }
                );
            } else {
                resolve(results);
            }
        }
        queueNext();
    });
}

function createPromiseGenerator<A, T>(arr: A[], convert: (val: A) => Promise<T>): IterableIterator<Promise<T>> {
    let idx = 0;
    const a = new IterableIterator<Promise<T>>(
        () => idx < arr.length,
        () => convert(arr[idx++]),
    );
    return a;
}

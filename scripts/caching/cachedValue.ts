
export class CachedValue<T> {

    private value: T;
    private isValueSet: boolean = false;
    private deferred: Promise<T>;
    constructor(private readonly generator: () => Promise<T>) {}

    public getValue(): Promise<T> {
        if (this.isValueSet) {
            return Promise.resolve(this.value);
        }

        if (!this.deferred) {
            this.deferred = this.generator().then(value => {
                this.isValueSet = true;
                this.value = value;
                return this.value;
            });
        }

        return this.deferred;
    }

    public isLoaded() {
        return this.isValueSet;
    }
}

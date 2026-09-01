class WhenBuilder<T> {
  private matched = false;

  constructor(private value: T) {}

  case<R>(condition: T, callback: () => R): this {
    if(!this.matched && this.value === condition) {
      callback();
      this.matched = true;
    }
    return this;
  }

  else<R>(defaultResult: R | (() => R)): R {
    return typeof defaultResult === 'function'
      ? (defaultResult as () => R)()
      : defaultResult;
  }
}
export function when<T>(value: T): WhenBuilder<T> {
  return new WhenBuilder(value);
}
export function wrap(obj: any, prop: string, onSet?: (v: any) => void, onGet?: () => any) {
  let val = obj[prop];
  Object.defineProperty(obj, prop, {
    get: () => onGet ? onGet() : val,
    set: (v) => { onSet?.(v); val = v; },
    enumerable: true
  });
}

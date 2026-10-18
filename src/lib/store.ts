import { useSyncExternalStore } from "react";

export function createStore<T>(initial: T) {
  let state = initial;
  const subs = new Set<() => void>();
  const get = () => state;
  const set = (next: Partial<T> | ((s: T) => Partial<T>)) => {
    const patch = typeof next === "function" ? next(state) : next;
    state = { ...state, ...patch };
    subs.forEach((f) => f());
  };
  const subscribe = (f: () => void) => {
    subs.add(f);
    return () => subs.delete(f);
  };
  function use<R>(sel: (s: T) => R): R {
    return useSyncExternalStore(subscribe, () => sel(state), () => sel(initial));
  }
  return { get, set, subscribe, use };
}

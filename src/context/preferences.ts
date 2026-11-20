import { useState } from "react";
export function usePreference<T>(name: string, fallback: T) {
  const key = `aether-${name}`;
  const [value, set] = useState<T>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
    } catch {
      return fallback;
    }
  });
  return [
    value,
    (next: T) => {
      localStorage.setItem(key, JSON.stringify(next));
      set(next);
    },
  ] as const;
}

import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Run `fn` immediately when the screen is focused, then every `intervalMs`
 * while it stays open. Clears on blur / unmount.
 */
export function useFocusRefresh(
  fn: () => void | Promise<void>,
  intervalMs: number = 8000,
  enabled: boolean = true
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      let cancelled = false;
      const run = async () => {
        if (cancelled) return;
        try {
          await fnRef.current();
        } catch {
          /* ignore */
        }
      };

      run();
      const id = setInterval(run, intervalMs);

      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [intervalMs, enabled])
  );
}

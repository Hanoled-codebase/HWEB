"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Updater<T> = T | ((current: T) => T);

/**
 * Cached, stale-while-revalidate replacement for the
 * `useState + useEffect(fetch) + setIsLoading` pattern. Returns the same
 * shape (`[data, setData, isLoading]`) so existing local mutations that call
 * `setData(...)` keep working — they now write into the shared cache.
 *
 * `isLoading` is true only when there is no cached data yet, so revisiting a
 * screen renders instantly and refreshes in the background.
 */
export function useCachedList<T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  options: { enabled?: boolean; initial: T; onError?: (error: unknown) => void },
) {
  const queryClient = useQueryClient();
  const { enabled = true, onError } = options;
  // Keep one stable fallback so consumers' effects/memos don't see a new
  // empty array on every render while loading.
  const [initial] = useState(() => options.initial);
  const keyHash = JSON.stringify(key);

  const query = useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      try {
        return await fetcher();
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
    enabled,
  });

  const setData = useCallback(
    (next: Updater<T>) => {
      queryClient.setQueryData<T>(key, (current) =>
        typeof next === "function"
          ? (next as (c: T) => T)(current ?? initial)
          : next,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, keyHash, initial],
  );

  return [query.data ?? initial, setData, enabled ? query.isPending : false] as const;
}

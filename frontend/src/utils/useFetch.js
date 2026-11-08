import { useEffect, useState } from 'react';

// Runs load() whenever deps change. Keeps the previous data on screen while refetching
// and ignores responses from outdated requests.
export function useFetch(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (!cancelled) setState({ data: null, error: error.message, loading: false });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "./http";
import type { Envelope } from "./types";
export function useRemote<T>(url: string | null) {
  const [result, setResult] = useState<Envelope<T> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!url);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    if (!url) {
      setResult(null);
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError("");
    api<T>(url, { signal: abort.signal })
      .then((r) => {
        if (!abort.signal.aborted) setResult(r);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [url, revision]);
  return { result, error, loading, refresh };
}

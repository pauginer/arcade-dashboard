"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 15_000;

export default function LiveCount({
  itemId,
  initialCount,
}: {
  itemId: number;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/counts", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.counts?.[itemId] === "number") {
          setCount(data.counts[itemId]);
        } else if (!cancelled) {
          setCount(0);
        }
      } catch {
        // Ignore transient network errors; the next poll will retry.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [itemId]);

  return <span>{count}</span>;
}

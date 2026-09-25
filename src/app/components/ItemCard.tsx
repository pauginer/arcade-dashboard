"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Item } from "@/lib/db";

const POLL_INTERVAL_MS = 4000;
const CELEBRATION_DURATION_MS = 1800;

export default function ItemCard({
  item,
  qrDataUrl,
  initialCount,
}: {
  item: Item;
  qrDataUrl: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [pulseKey, setPulseKey] = useState(0);
  const [delta, setDelta] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const countRef = useRef(initialCount);
  const celebrationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/counts", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const next =
          typeof data.counts?.[item.id] === "number" ? data.counts[item.id] : 0;

        if (next > countRef.current) {
          setDelta(next - countRef.current);
          setPulseKey((k) => k + 1);
          setCelebrating(true);
          if (celebrationTimeout.current) clearTimeout(celebrationTimeout.current);
          celebrationTimeout.current = setTimeout(() => {
            setCelebrating(false);
          }, CELEBRATION_DURATION_MS);
        }
        countRef.current = next;
        setCount(next);
      } catch {
        // Ignore transient network errors; the next poll will retry.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (celebrationTimeout.current) clearTimeout(celebrationTimeout.current);
    };
  }, [item.id]);

  return (
    <div className="relative rounded-xl">
      {celebrating && (
        <div
          key={pulseKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 rounded-xl animate-[scan-glow_1.8s_ease-out_forwards]"
        />
      )}

      <article className="relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div className="relative h-32 w-full bg-slate-800 sm:h-36">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 p-1.5">
          <div>
            <h2 className="text-sm font-semibold leading-snug">{item.title}</h2>
            {item.description && (
              <p className="mt-0.5 text-xs text-slate-300 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 pt-0.5">
            <div className="rounded-lg bg-white p-1.5">
              {/* QR code is a base64 data URL generated per-request server-side */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code to ${item.title}`}
                width={80}
                height={80}
              />
            </div>
            <div className="relative text-right">
              {celebrating && (
                <span
                  key={`delta-${pulseKey}`}
                  aria-hidden
                  className="pointer-events-none absolute -top-3 right-0 text-sm font-semibold text-indigo-300 animate-[float-up_1.6s_ease-out_forwards]"
                >
                  +{delta}
                </span>
              )}
              <div className="text-xl font-bold tabular-nums">
                <span
                  key={celebrating ? `count-${pulseKey}` : "count-idle"}
                  className={
                    celebrating
                      ? "inline-block animate-[count-pop_1.8s_ease-out]"
                      : "inline-block"
                  }
                >
                  {count}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                scans today
              </div>
            </div>
          </div>
        </div>

        {celebrating && (
          <div
            key={`flash-${pulseKey}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 animate-[scan-flash_1.4s_ease-out_forwards]"
          />
        )}
      </article>
    </div>
  );
}

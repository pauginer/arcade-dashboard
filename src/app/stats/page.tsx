import Link from "next/link";
import { getMonthlyLeaderboard, getMonthlyScanTotals } from "@/lib/db";

export const dynamic = "force-dynamic";

const MONTHS_BACK = 6;
const LEADERBOARD_SIZE = 5;

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatMonthShort(monthKey: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    parseMonthKey(monthKey)
  );
}

function formatMonthLong(monthKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseMonthKey(monthKey));
}

export default async function StatsPage() {
  const [totals, leaderboard] = await Promise.all([
    getMonthlyScanTotals(MONTHS_BACK),
    getMonthlyLeaderboard(MONTHS_BACK, LEADERBOARD_SIZE),
  ]);

  const maxCount = Math.max(0, ...totals.map((t) => t.count));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stats</h1>
        <div className="flex gap-4 text-sm text-slate-400">
          <Link
            href="/"
            className="underline decoration-dotted underline-offset-4 hover:text-slate-200"
          >
            View display
          </Link>
          <Link
            href="/admin"
            className="underline decoration-dotted underline-offset-4 hover:text-slate-200"
          >
            Manage list
          </Link>
        </div>
      </header>

      <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-6 text-lg font-semibold">Scans per month</h2>
        <div className="flex gap-3 sm:gap-4">
          {totals.map((t) => {
            const barPct =
              maxCount === 0 || t.count === 0
                ? 0
                : Math.max((t.count / maxCount) * 100, 4);
            return (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative h-48 w-full">
                  <div
                    className="absolute inset-x-2 bottom-0 rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400"
                    style={{ height: `${barPct}%` }}
                  />
                  <div
                    className="absolute inset-x-0 text-center text-sm font-semibold tabular-nums text-slate-200"
                    style={{ bottom: `calc(${barPct}% + 6px)` }}
                  >
                    {t.count}
                  </div>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {formatMonthShort(t.month)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Monthly leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-slate-400">No scans recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {leaderboard.map((month) => (
              <div
                key={month.month}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <h3 className="mb-4 text-base font-semibold text-slate-200">
                  {formatMonthLong(month.month)}
                </h3>
                <ol className="flex flex-col gap-2">
                  {month.entries.map((entry, index) => (
                    <li key={entry.itemId} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-300">
                        {entry.count}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

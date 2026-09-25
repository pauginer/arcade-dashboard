import postgres from "postgres";

let cachedSql: ReturnType<typeof postgres> | null = null;

// Lazily created so importing this module (e.g. during the Next.js build's
// page-data collection) doesn't require DATABASE_URL to be set.
function getSql(): ReturnType<typeof postgres> {
  if (!cachedSql) {
    // Vercel's Postgres/Neon integration prefixes its env vars with the
    // storage connection's name (e.g. STORAGE_DATABASE_URL) instead of the
    // plain DATABASE_URL, depending on how the store was named when created.
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.STORAGE_DATABASE_URL ||
      process.env.STORAGE_POSTGRES_URL ||
      process.env.STORAGE_DATABASE_URL_UNPOOLED;

    if (!connectionString) {
      throw new Error(
        "No database connection string found. Connect a Postgres/Neon integration in Vercel " +
          "(Storage tab), or set DATABASE_URL in .env.local for local development."
      );
    }

    cachedSql = postgres(connectionString, { ssl: "prefer" });
  }
  return cachedSql;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS items (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          image_url TEXT,
          destination_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS scans (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
          scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS scans_item_id_scanned_at_idx
          ON scans (item_id, scanned_at)
      `;
      // Added after the initial release: nullable so existing rows don't
      // need a default, backfilled from `id` (which already matches
      // creation order) so display order doesn't change on first deploy.
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS sort_order INTEGER`;
      await sql`UPDATE items SET sort_order = id WHERE sort_order IS NULL`;
    })();
  }
  return schemaReady;
}

export type Item = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  destination_url: string;
  created_at: string;
};

export async function getItems(): Promise<Item[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, description, image_url, destination_url, created_at
    FROM items
    ORDER BY sort_order ASC, created_at ASC
  `;
  return rows as unknown as Item[];
}

export async function getItem(id: number): Promise<Item | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, description, image_url, destination_url, created_at
    FROM items
    WHERE id = ${id}
  `;
  return (rows[0] as unknown as Item) ?? null;
}

export async function addItem(input: {
  title: string;
  description: string;
  imageUrl: string | null;
  destinationUrl: string;
}): Promise<Item> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO items (title, description, image_url, destination_url, sort_order)
    VALUES (
      ${input.title}, ${input.description}, ${input.imageUrl}, ${input.destinationUrl},
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM items)
    )
    RETURNING id, title, description, image_url, destination_url, created_at
  `;
  return rows[0] as unknown as Item;
}

// Persists a new display order: `orderedIds` lists every item id in the
// order they should appear on the public display.
export async function reorderItems(orderedIds: number[]): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql.begin(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx`UPDATE items SET sort_order = ${i} WHERE id = ${orderedIds[i]}`;
    }
  });
}

export async function updateItem(
  id: number,
  input: {
    title: string;
    description: string;
    imageUrl: string | null;
    destinationUrl: string;
  }
): Promise<Item> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE items
    SET title = ${input.title},
        description = ${input.description},
        image_url = ${input.imageUrl},
        destination_url = ${input.destinationUrl}
    WHERE id = ${id}
    RETURNING id, title, description, image_url, destination_url, created_at
  `;
  return rows[0] as unknown as Item;
}

export async function deleteItem(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM items WHERE id = ${id}`;
}

export async function logScan(itemId: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`INSERT INTO scans (item_id) VALUES (${itemId})`;
}

// Number of scans for each item since the start of the current UTC day.
//
// The double `AT TIME ZONE 'UTC'` is not a no-op: the connection's session
// timezone (e.g. a local Postgres defaults to the host's zone) affects what
// `date_trunc` considers "the start of the day". Converting to a naive UTC
// timestamp, truncating, then converting back pins the boundary to UTC
// regardless of session timezone.
export async function getTodayScanCounts(): Promise<Record<number, number>> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT item_id, COUNT(*)::int AS count
    FROM scans
    WHERE scanned_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    GROUP BY item_id
  `;
  const counts: Record<number, number> = {};
  for (const row of rows as unknown as { item_id: number; count: number }[]) {
    counts[row.item_id] = row.count;
  }
  return counts;
}

// First day (UTC) of the month that is `monthsBack - 1` months before the
// current one, i.e. the start of the window returned by the functions below.
function monthsBackCutoff(monthsBack: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
}

export type MonthlyTotal = { month: string; count: number };

// Total scans per calendar month for the last `monthsBack` months (including
// the current one), oldest first. Months with no scans are included as 0 so
// charts get a continuous timeline.
//
// Month keys ("YYYY-MM") are computed in SQL as UTC text, not as JS Dates:
// a `date_trunc('month', scanned_at)` result is a timestamptz that gets
// parsed back into a JS Date depending on session/driver timezone handling,
// which previously caused month boundaries to shift by the session's UTC
// offset. Converting to UTC before truncating, then formatting straight to
// text, sidesteps that entirely.
export async function getMonthlyScanTotals(monthsBack = 6): Promise<MonthlyTotal[]> {
  await ensureSchema();
  const sql = getSql();
  const cutoff = monthsBackCutoff(monthsBack);

  const rows = (await sql`
    SELECT to_char(date_trunc('month', scanned_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
           COUNT(*)::int AS count
    FROM scans
    WHERE scanned_at >= ${cutoff}
    GROUP BY month
  `) as unknown as { month: string; count: number }[];

  const countsByMonth = new Map<string, number>();
  for (const row of rows) {
    countsByMonth.set(row.month, row.count);
  }

  const now = new Date();
  const totals: MonthlyTotal[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    totals.push({ month: key, count: countsByMonth.get(key) ?? 0 });
  }
  return totals;
}

export type MonthlyLeaderboardEntry = { itemId: number; title: string; count: number };
export type MonthlyLeaderboard = { month: string; entries: MonthlyLeaderboardEntry[] };

// The top `topN` most-scanned items for each of the last `monthsBack`
// months, most recent month first. Months with no scans are omitted.
export async function getMonthlyLeaderboard(
  monthsBack = 6,
  topN = 5
): Promise<MonthlyLeaderboard[]> {
  await ensureSchema();
  const sql = getSql();
  const cutoff = monthsBackCutoff(monthsBack);

  const rows = (await sql`
    SELECT to_char(date_trunc('month', s.scanned_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
           s.item_id, i.title, COUNT(*)::int AS count
    FROM scans s
    JOIN items i ON i.id = s.item_id
    WHERE s.scanned_at >= ${cutoff}
    GROUP BY month, s.item_id, i.title
    ORDER BY month DESC, count DESC
  `) as unknown as { month: string; item_id: number; title: string; count: number }[];

  const byMonth = new Map<string, MonthlyLeaderboardEntry[]>();
  for (const row of rows) {
    const entries = byMonth.get(row.month) ?? [];
    if (entries.length < topN) {
      entries.push({ itemId: row.item_id, title: row.title, count: row.count });
    }
    byMonth.set(row.month, entries);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([month, entries]) => ({ month, entries }));
}

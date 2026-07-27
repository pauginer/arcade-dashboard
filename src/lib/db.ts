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
    ORDER BY created_at ASC
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
    INSERT INTO items (title, description, image_url, destination_url)
    VALUES (${input.title}, ${input.description}, ${input.imageUrl}, ${input.destinationUrl})
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
export async function getTodayScanCounts(): Promise<Record<number, number>> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT item_id, COUNT(*)::int AS count
    FROM scans
    WHERE scanned_at >= date_trunc('day', now())
    GROUP BY item_id
  `;
  const counts: Record<number, number> = {};
  for (const row of rows as unknown as { item_id: number; count: number }[]) {
    counts[row.item_id] = row.count;
  }
  return counts;
}

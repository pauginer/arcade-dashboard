import Link from "next/link";
import { getItems, getTodayScanCounts } from "@/lib/db";
import { generateQrCodeDataUrl, getRedirectUrl } from "@/lib/qrcode";
import ItemCard from "@/app/components/ItemCard";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const [items, counts] = await Promise.all([getItems(), getTodayScanCounts()]);

  const cards = await Promise.all(
    items.map(async (item) => {
      const url = await getRedirectUrl(item.id);
      const qrDataUrl = await generateQrCodeDataUrl(url);
      return { item, qrDataUrl };
    })
  );

  return (
    <main className="flex-1 px-6 py-2 sm:px-8">
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Games, Apps &amp; Wiki
        </h1>
        <div className="flex gap-4 text-sm text-slate-400">
          <Link
            href="/stats"
            className="underline decoration-dotted underline-offset-4 hover:text-slate-200"
          >
            Stats
          </Link>
          <Link
            href="/admin"
            className="underline decoration-dotted underline-offset-4 hover:text-slate-200"
          >
            Manage list
          </Link>
        </div>
      </header>

      {cards.length === 0 ? (
        <p className="text-slate-400">
          No items yet.{" "}
          <Link href="/admin" className="underline underline-offset-2">
            Add the first one
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {cards.map(({ item, qrDataUrl }) => (
            <ItemCard
              key={item.id}
              item={item}
              qrDataUrl={qrDataUrl}
              initialCount={counts[item.id] ?? 0}
            />
          ))}
        </div>
      )}
    </main>
  );
}

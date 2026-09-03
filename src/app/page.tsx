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
    <main className="flex-1 px-8 py-10 sm:px-12">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Games &amp; Experiences
        </h1>
        <Link
          href="/admin"
          className="text-sm text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-200"
        >
          Manage list
        </Link>
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
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
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

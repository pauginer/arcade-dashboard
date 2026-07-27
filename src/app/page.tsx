import Image from "next/image";
import Link from "next/link";
import { getItems, getTodayScanCounts } from "@/lib/db";
import { generateQrCodeDataUrl, getRedirectUrl } from "@/lib/qrcode";
import LiveCount from "@/app/components/LiveCount";

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
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg"
            >
              <div className="relative aspect-video w-full bg-slate-800">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    No image
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-4 p-6">
                <div>
                  <h2 className="text-2xl font-semibold">{item.title}</h2>
                  {item.description && (
                    <p className="mt-2 text-slate-300">{item.description}</p>
                  )}
                </div>

                <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                  <div className="rounded-xl bg-white p-2">
                    {/* QR code is a base64 data URL generated per-request server-side */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={`QR code to ${item.title}`}
                      width={110}
                      height={110}
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold tabular-nums">
                      <LiveCount itemId={item.id} initialCount={counts[item.id] ?? 0} />
                    </div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      scans today
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

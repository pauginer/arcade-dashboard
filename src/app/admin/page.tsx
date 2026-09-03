import Link from "next/link";
import { getItems } from "@/lib/db";
import { addItemAction } from "@/app/actions";
import EditableItemRow from "@/app/components/EditableItemRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const items = await getItems();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage games &amp; experiences</h1>
        <Link
          href="/"
          className="text-sm text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-200"
        >
          View display
        </Link>
      </header>

      <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold">Add a new item</h2>
        <form action={addItemAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              type="text"
              name="title"
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Description
            <textarea
              name="description"
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Destination URL (where the QR code redirects to)
            <input
              type="url"
              name="destinationUrl"
              placeholder="https://example.com/experience"
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Image
            <input
              type="file"
              name="image"
              accept="image/*"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-slate-100"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
          >
            Add item
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Current items</h2>
        {items.length === 0 ? (
          <p className="text-slate-400">No items yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <EditableItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

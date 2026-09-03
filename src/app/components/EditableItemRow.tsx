"use client";

import { useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import type { Item } from "@/lib/db";
import { updateItemAction, deleteItemAction } from "@/app/actions";

export default function EditableItemRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await updateItemAction(formData);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save changes.");
      }
    });
  }

  if (!editing) {
    return (
      <li className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
          {item.image_url && (
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.title}</p>
          <p className="truncate text-sm text-slate-400">{item.destination_url}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Edit
        </button>
        <form action={deleteItemAction}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950"
          >
            Delete
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-indigo-800 bg-slate-900/60 p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={item.id} />

        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            type="text"
            name="title"
            defaultValue={item.title}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            defaultValue={item.description}
            rows={2}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Destination URL
          <input
            type="url"
            name="destinationUrl"
            defaultValue={item.destination_url}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
            {item.image_url && (
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            )}
          </div>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            Replace image
            <input
              type="file"
              name="image"
              accept="image/*"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-slate-100"
            />
          </label>
          {item.image_url && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="removeImage"
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
              Remove image
            </label>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </li>
  );
}

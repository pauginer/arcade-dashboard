"use client";

import { useState, useTransition } from "react";
import type { Item } from "@/lib/db";
import { reorderItemsAction } from "@/app/actions";
import EditableItemRow from "@/app/components/EditableItemRow";

export default function ReorderableItemList({ items }: { items: Item[] }) {
  const [order, setOrder] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  // Stay in sync with the server-fetched list (e.g. after an add/delete/
  // reorder revalidates) without clobbering a drag the user is mid-way
  // through. Adjusting state during render (rather than in an effect) avoids
  // an extra render pass; see https://react.dev/learn/you-might-not-need-an-effect.
  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items);
  }

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    startTransition(() => {
      reorderItemsAction(next.map((item) => item.id));
    });
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex !== null && dragIndex !== dropIndex) {
      moveTo(dragIndex, dropIndex);
    }
    setDragIndex(null);
  }

  function setItemEditing(id: number, editing: boolean) {
    setEditingIds((prev) => {
      const next = new Set(prev);
      if (editing) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {order.map((item, index) => (
        <li
          key={item.id}
          draggable={!editingIds.has(item.id)}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          onDragEnd={() => setDragIndex(null)}
          className={`flex items-start gap-2 rounded-xl ${
            dragIndex === index ? "opacity-40" : ""
          }`}
        >
          <div className="flex flex-col items-center gap-1 pt-3 text-slate-500">
            <span
              className="cursor-grab select-none text-base leading-none"
              title="Drag to reorder"
              aria-hidden
            >
              ⠿
            </span>
            <button
              type="button"
              onClick={() => moveTo(index, index - 1)}
              disabled={index === 0}
              aria-label={`Move ${item.title} up`}
              className="rounded px-1 leading-tight hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => moveTo(index, index + 1)}
              disabled={index === order.length - 1}
              aria-label={`Move ${item.title} down`}
              className="rounded px-1 leading-tight hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ▼
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <EditableItemRow
              item={item}
              onEditingChange={(editing) => setItemEditing(item.id, editing)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

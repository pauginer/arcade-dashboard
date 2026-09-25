"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { addItem, deleteItem, getItem, reorderItems, updateItem } from "@/lib/db";

export async function addItemAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const destinationUrl = String(formData.get("destinationUrl") || "").trim();
  const image = formData.get("image");

  if (!title || !destinationUrl) {
    throw new Error("Title and destination URL are required.");
  }

  // Validate the destination is a well-formed absolute URL before storing it.
  new URL(destinationUrl);

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    const blob = await put(`items/${Date.now()}-${image.name}`, image, {
      access: "public",
      addRandomSuffix: true,
    });
    imageUrl = blob.url;
  }

  await addItem({ title, description, imageUrl, destinationUrl });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateItemAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const destinationUrl = String(formData.get("destinationUrl") || "").trim();
  const removeImage = formData.get("removeImage") === "on";
  const image = formData.get("image");

  if (!Number.isInteger(id)) {
    throw new Error("Invalid item id.");
  }
  if (!title || !destinationUrl) {
    throw new Error("Title and destination URL are required.");
  }

  // Validate the destination is a well-formed absolute URL before storing it.
  new URL(destinationUrl);

  const existing = await getItem(id);
  if (!existing) {
    throw new Error("Item not found.");
  }

  let imageUrl = existing.image_url;

  if (image instanceof File && image.size > 0) {
    const blob = await put(`items/${Date.now()}-${image.name}`, image, {
      access: "public",
      addRandomSuffix: true,
    });
    if (existing.image_url) {
      try {
        await del(existing.image_url);
      } catch {
        // Ignore failures deleting the old blob; it's now orphaned but harmless.
      }
    }
    imageUrl = blob.url;
  } else if (removeImage && existing.image_url) {
    try {
      await del(existing.image_url);
    } catch {
      // Ignore failures deleting the blob; the DB row is the source of truth.
    }
    imageUrl = null;
  }

  await updateItem(id, { title, description, imageUrl, destinationUrl });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function reorderItemsAction(orderedIds: number[]): Promise<void> {
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => !Number.isInteger(id))) {
    throw new Error("Invalid item order.");
  }

  await reorderItems(orderedIds);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid item id.");
  }

  const item = await getItem(id);
  if (item?.image_url) {
    try {
      await del(item.image_url);
    } catch {
      // Ignore failures deleting the blob; the DB row is the source of truth.
    }
  }

  await deleteItem(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

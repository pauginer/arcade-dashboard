"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { addItem, deleteItem, getItem } from "@/lib/db";

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

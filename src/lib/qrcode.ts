import QRCode from "qrcode";
import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export function getRedirectPath(itemId: number): string {
  return `/r/${itemId}`;
}

export async function getRedirectUrl(itemId: number): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}${getRedirectPath(itemId)}`;
}

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 320,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

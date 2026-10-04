import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";

export const dynamic = "force-dynamic";
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

/** Serves admin-uploaded product imagery from the database with strict content headers. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const db = await getDb();
  const [img] = await db.select().from(s.productImages).where(eq(s.productImages.id, id)).limit(1);
  if (!img || !ALLOWED.has(img.contentType)) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.contentType,
      "Content-Length": String(img.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}

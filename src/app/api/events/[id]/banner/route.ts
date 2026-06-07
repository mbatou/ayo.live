import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireEventOwner } from "@/lib/auth/guards";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_BYTES = 5 * 1024 * 1024; // 5MB ceiling pre-processing
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;

// Magic-number sniff. Don't trust client-reported content-type — a
// renamed .exe with image/jpeg is still not an image. Sharp would
// reject it later but rejecting before reading 5MB into memory is
// faster.
function detectImageFormat(
  bytes: Uint8Array,
): "jpeg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  // WebP: 'RIFF' .... 'WEBP'
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const guard = await requireEventOwner(supabase, id);
  if (guard instanceof Response) return guard;
  const { user, event } = guard;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'banner' file" },
      { status: 400 },
    );
  }

  const file = formData.get("banner");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing 'banner' file" },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large — max ${Math.round(MAX_BYTES / 1024 / 1024)}MB.`,
      },
      { status: 400 },
    );
  }

  const raw = new Uint8Array(await file.arrayBuffer());
  const format = detectImageFormat(raw);
  if (!format) {
    return NextResponse.json(
      { error: "Unsupported image format — use JPEG, PNG, or WebP." },
      { status: 400 },
    );
  }

  let processed: Buffer;
  try {
    // .rotate() applies EXIF orientation then strips it. .webp() output
    // doesn't carry source metadata by default, so EXIF (incl. GPS) is
    // dropped from the stored file.
    const pipeline = sharp(raw).rotate();
    const meta = await pipeline.metadata();
    if (
      !meta.width ||
      !meta.height ||
      meta.width < MIN_WIDTH ||
      meta.height < MIN_HEIGHT
    ) {
      return NextResponse.json(
        {
          error: `Image must be at least ${MIN_WIDTH}×${MIN_HEIGHT}.`,
        },
        { status: 400 },
      );
    }
    processed = await pipeline
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    console.error("[banner] processing failed:", err);
    return NextResponse.json(
      { error: "Image processing failed" },
      { status: 400 },
    );
  }

  const path = `${user.id}/${event.id}.webp`;
  const service = createServiceClient();
  const { error: uploadErr } = await service.storage
    .from("event-banners")
    .upload(path, processed, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
  if (uploadErr) {
    console.error("[banner] upload failed:", uploadErr);
    return NextResponse.json(
      { error: "Could not upload banner" },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = service.storage.from("event-banners").getPublicUrl(path);

  // Cache-bust so a re-upload reflects on the CDN without a 1-year wait.
  const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await service
    .from("events")
    .update({ cover_url: cacheBustedUrl })
    .eq("id", event.id);
  if (updateErr) {
    console.error("[banner] event row update failed:", updateErr);
    return NextResponse.json(
      { error: "Banner uploaded but the event row didn't update — try again" },
      { status: 500 },
    );
  }

  return NextResponse.json({ cover_url: cacheBustedUrl });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const guard = await requireEventOwner(supabase, id);
  if (guard instanceof Response) return guard;
  const { user, event } = guard;

  const service = createServiceClient();
  await service.storage
    .from("event-banners")
    .remove([`${user.id}/${event.id}.webp`]);
  await service
    .from("events")
    .update({ cover_url: null })
    .eq("id", event.id);

  return NextResponse.json({ ok: true });
}

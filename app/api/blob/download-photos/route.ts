import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  prefixes?: string[]; // defaults to ["operadores/", "embarques/"]
  startIso?: string; // inclusive
  endIso?: string;   // exclusive
};

// Try to get a timestamp for a blob for filtering by date
function getBlobTime(b: any): number | undefined {
  if (b?.uploadedAt) {
    const t = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : Date.parse(b.uploadedAt);
    if (!Number.isNaN(t)) return t;
  }
  const path = b?.pathname || b?.url || '';
  const name = String(path).split('/').pop() || '';
  const m = name.match(/(\d{10,13})/);
  if (m) {
    const num = Number(m[1]);
    return m[1].length >= 13 ? num : num * 1000;
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Falta BLOB_READ_WRITE_TOKEN en el servidor." }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Body | undefined;
    const prefixes = body?.prefixes?.length ? body.prefixes : ["operadores/", "embarques/"];
    const startTs = body?.startIso ? Date.parse(body.startIso) : undefined;
    const endTs = body?.endIso ? Date.parse(body.endIso) : undefined;

    // Prepare zip stream
    const zip = archiver("zip", { zlib: { level: 9 } });
    const pass = new PassThrough();
    zip.pipe(pass);

    // Wire basic error propagation so client doesn't hang on failures
    zip.on("error", (err: unknown) => {
      try { pass.destroy(err as any); } catch {}
    });

    // Collect and stream-add files asynchronously while the response streams
    (async () => {
      try {
        for (const prefix of prefixes) {
          let cursor: string | undefined = undefined;
          do {
            const { blobs, cursor: nextCursor }: { blobs: Array<{ url: string; pathname?: string; uploadedAt?: Date | string }>; cursor?: string } = await list({
              prefix,
              token: process.env.BLOB_READ_WRITE_TOKEN,
              cursor,
            });

            for (const b of blobs) {
              if (startTs !== undefined || endTs !== undefined) {
                const bt = getBlobTime(b);
                if (bt === undefined) continue; // Skip if we cannot determine time when filtering
                if (startTs !== undefined && bt < startTs) continue;
                if (endTs !== undefined && bt >= endTs) continue;
              }

      const pathname = (b as any).pathname || new URL(b.url).pathname.replace(/^\/+/, "");
      const res = await fetch(b.url);
      if (!res.ok || !res.body) continue;
      // Convert WHATWG ReadableStream to Node stream for archiver
      const nodeBody = Readable.fromWeb(res.body as any);
      // Add file stream to zip preserving folder structure
      zip.append(nodeBody, { name: pathname });
            }
            cursor = nextCursor;
          } while (cursor);
        }
      } catch (e) {
        // If any error occurs during adding, emit it to the archive
        zip.emit("error", e as any);
      } finally {
    try { await zip.finalize(); } catch {}
      }
    })();

    const filename = `fotos-blob-${new Date().toISOString().slice(0, 10)}.zip`;
    return new Response(pass as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("download-photos error:", error);
    return NextResponse.json({ error: error?.message || "Error desconocido" }, { status: 500 });
  }
}

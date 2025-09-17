import { NextResponse } from "next/server";
import { list, del } from "@vercel/blob";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CleanupBody = {
  prefixes?: string[]; // e.g., ["operadores/", "embarques/"]
  dryRun?: boolean;
  limit?: number; // optional safety limit of files to delete
  startIso?: string; // inclusive
  endIso?: string;   // exclusive
};

// util: verify provided admin password against app_users table for the current admin
async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    // Detect current user from local headers is not possible in a server route without session.
    // Instead, validate against the single admin row when exists. If multiple admins, allow when any matches.
    const { data, error } = await supabase
      .from("app_users")
      .select("id, username, password_hash, password_salt, is_admin, active")
      .eq("is_admin", true)
      .eq("active", true);
    if (error || !data || data.length === 0) {
      return false;
    }
    // Reuse client-side hash fn via WebCrypto when present; do a simple PBKDF2 compatible hash here.
    // Since we don't import the helper, implement a minimal PBKDF2 using SubtleCrypto if available.
  const subtle = (globalThis as any)?.crypto?.subtle;
  const enc = new TextEncoder();
    for (const admin of data) {
      try {
        let hashHex: string | null = null;
        if (subtle) {
      // Decode base64 salt using Buffer to support Node runtime
      const saltBuf = Buffer.from(String(admin.password_salt || ''), 'base64');
      const saltBin = new Uint8Array(saltBuf);
          const key = await subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
          const bits = await subtle.deriveBits({ name: "PBKDF2", salt: saltBin, iterations: 100_000, hash: "SHA-256" }, key, 256);
          const bytes = Array.from(new Uint8Array(bits));
          hashHex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        if (!hashHex) {
          // Fallback: reject if we cannot verify securely on server
          continue;
        }
        if (hashHex === admin.password_hash) return true;
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CleanupBody & { adminPassword?: string };
    const adminPassword = (body as any)?.adminPassword;
    if (!adminPassword) {
      return NextResponse.json({ error: "Se requiere contraseña de administrador." }, { status: 401 });
    }
    const okPwd = await verifyAdminPassword(adminPassword);
    if (!okPwd) {
      return NextResponse.json({ error: "Contraseña de administrador inválida." }, { status: 403 });
    }
  const prefixes = (body?.prefixes && Array.isArray(body.prefixes) && body.prefixes.length > 0)
      ? body.prefixes
      : ["operadores/", "embarques/"];
    const dryRun = Boolean(body?.dryRun);
    const limit = typeof body?.limit === 'number' && body.limit > 0 ? Math.floor(body.limit) : undefined;
  const startTs = body?.startIso ? Date.parse(body.startIso) : undefined;
  const endTs = body?.endIso ? Date.parse(body.endIso) : undefined;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        error: "Falta BLOB_READ_WRITE_TOKEN en el servidor.",
      }, { status: 500 });
    }

    let scanned = 0;
    let deleted = 0;
    const details: Array<{ prefix: string; scanned: number; deleted: number; }> = [];

    // helper to extract approximate upload time
    const getBlobTime = (b: any): number | undefined => {
      if (b?.uploadedAt) {
        const t = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : Date.parse(b.uploadedAt);
        if (!Number.isNaN(t)) return t;
      }
      const path = b?.pathname || b?.url || '';
      const name = String(path).split('/').pop() || '';
      const m = name.match(/(\d{10,13})/);
      if (m) {
        const num = Number(m[1]);
        if (m[1].length >= 13) return num; // ms
        return num * 1000; // seconds
      }
      return undefined;
    };

    for (const prefix of prefixes) {
  let cursor: string | undefined = undefined;
      let scannedThis = 0;
      let deletedThis = 0;
      do {
  const { blobs, cursor: nextCursor }: { blobs: Array<{ url: string; pathname?: string; uploadedAt?: Date | string }>; cursor?: string } = await list({
          prefix,
          token: process.env.BLOB_READ_WRITE_TOKEN,
          cursor,
        });
        for (const b of blobs) {
          scanned++; scannedThis++;
          // filter by optional date range
          if (startTs !== undefined || endTs !== undefined) {
            const bt = getBlobTime(b);
            if (bt === undefined) {
              // if we can't determine time, skip when filtering is requested
              continue;
            }
            if (startTs !== undefined && bt < startTs) continue;
            if (endTs !== undefined && bt >= endTs) continue;
          }
          if (!dryRun) {
            await del(b.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
            deleted++; deletedThis++;
          }
          if (limit && deleted >= limit) break;
        }
  cursor = nextCursor;
        if (limit && deleted >= limit) break;
      } while (cursor);
      details.push({ prefix, scanned: scannedThis, deleted: dryRun ? 0 : deletedThis });
      if (limit && deleted >= limit) break;
    }

  return NextResponse.json({
      ok: true,
      dryRun,
      scanned,
      deleted,
      details,
    });
  } catch (error: any) {
    console.error("Blob cleanup error:", error);
    return NextResponse.json({ error: error?.message || "Error desconocido" }, { status: 500 });
  }
}

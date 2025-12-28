import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { list, del } from "@vercel/blob";

type BlobCleanupSummary =
    | { ok: true; scanned: number; deleted: number; details: Array<{ prefix: string; scanned: number; deleted: number }> }
    | { ok: false; reason: string };

async function purgeBlobStorage(prefixes: string[], token?: string): Promise<BlobCleanupSummary> {
    if (!token) {
        return { ok: false, reason: "Blob cleanup skipped: missing BLOB_READ_WRITE_TOKEN." };
    }

    let scanned = 0;
    let deleted = 0;
    const details: Array<{ prefix: string; scanned: number; deleted: number }> = [];

    try {
        for (const prefix of prefixes) {
            let cursor: string | undefined = undefined;
            let scannedThis = 0;
            let deletedThis = 0;

            do {
                const { blobs, cursor: nextCursor }: { blobs: Array<{ url: string }>; cursor?: string } = await list({
                    prefix,
                    token,
                    cursor,
                });

                for (const blob of blobs) {
                    scanned++;
                    scannedThis++;
                    await del(blob.url, { token });
                    deleted++;
                    deletedThis++;
                }

                cursor = nextCursor;
            } while (cursor);

            details.push({ prefix, scanned: scannedThis, deleted: deletedThis });
        }

        return { ok: true, scanned, deleted, details };
    } catch (error: any) {
        return { ok: false, reason: error?.message || "Unexpected blob cleanup failure." };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { confirm } = (req.body ?? {}) as { confirm?: boolean };
        if (!confirm) return res.status(400).json({ error: "Missing confirmation" });

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceRoleKey) {
            return res.status(500).json({ error: "Missing Supabase admin env vars" });
        }

        const supabaseAdmin = createClient(url, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const deleteSpecs = [
            { table: "fotos_embarques", query: supabaseAdmin.from("fotos_embarques").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "operador_confirmaciones_embarque", query: supabaseAdmin.from("operador_confirmaciones_embarque").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "embarque_modificaciones", query: supabaseAdmin.from("embarque_modificaciones").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "historial_estados_facturacion", query: supabaseAdmin.from("historial_estados_facturacion").delete().neq("id", -1) },
            { table: "operador_pagos_contingencia", query: supabaseAdmin.from("operador_pagos_contingencia").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "documentos_operadores", query: supabaseAdmin.from("documentos_operadores").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "imagenes_perfil_operador", query: supabaseAdmin.from("imagenes_perfil_operador").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "archivos_operadores", query: supabaseAdmin.from("archivos_operadores").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "registros_mantenimiento_remolques", query: supabaseAdmin.from("registros_mantenimiento_remolques").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "registros_mantenimiento", query: supabaseAdmin.from("registros_mantenimiento").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "registros_kilometraje", query: supabaseAdmin.from("registros_kilometraje").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "recordatorios", query: supabaseAdmin.from("recordatorios").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "audit_logs", query: supabaseAdmin.from("audit_logs").delete().neq("id", -1) },
            { table: "embarques", query: supabaseAdmin.from("embarques").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "contactos_clientes", query: supabaseAdmin.from("contactos_clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "representantes_clientes", query: supabaseAdmin.from("representantes_clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "clientes", query: supabaseAdmin.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "remolques", query: supabaseAdmin.from("remolques").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "camiones", query: supabaseAdmin.from("camiones").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
            { table: "operadores", query: supabaseAdmin.from("operadores").delete().neq("id", "00000000-0000-0000-0000-000000000000") },
        ];

        const ignorableTables = new Set(["imagenes_perfil_operador", "archivos_operadores"]);
        const ignorableCodes = new Set(["42P01"]); // undefined_table

        const isIgnorableError = (table: string, error: any) => {
            if (!error) return false;
            const code = error?.code || error?.details?.code;
            const message: string | undefined = error?.message || error?.reason || error?.details;
            if (!ignorableTables.has(table)) return false;
            if (code && ignorableCodes.has(code)) return true;
            if (typeof message === "string" && message.toLowerCase().includes("does not exist")) return true;
            return false;
        };

        const results = await Promise.allSettled(deleteSpecs.map((spec) => spec.query));
        const errors = results
            .map((r, i) => ({ r, spec: deleteSpecs[i] }))
            .filter(({ r, spec }) => {
                if (r.status === "rejected") {
                    const reason: any = r.reason;
                    if (isIgnorableError(spec.table, reason)) return false;
                    return true;
                }
                const value: any = r.value;
                if (!value?.error) return false;
                if (isIgnorableError(spec.table, value.error)) return false;
                return true;
            })
            .map(({ r, spec }) => {
                if (r.status === "rejected") {
                    return { table: spec.table, error: r.reason };
                }
                return { table: spec.table, error: r.value?.error };
            });

        if (errors.length > 0) return res.status(500).json({ ok: false, errors });

        const blobSummary = await purgeBlobStorage(["operadores/", "embarques/"], process.env.BLOB_READ_WRITE_TOKEN);

        if (!blobSummary.ok) {
            return res.status(200).json({ ok: true, blob: blobSummary });
        }

        return res.status(200).json({ ok: true, blob: blobSummary });
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || "Cleanup failed" });
    }
}

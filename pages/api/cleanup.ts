import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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

        const deletes = [
            supabaseAdmin.from("fotos_embarques").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("operador_confirmaciones_embarque").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("embarque_modificaciones").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("historial_estados_facturacion").delete().neq("id", -1),
            supabaseAdmin.from("operador_pagos_contingencia").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("documentos_operadores").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("registros_mantenimiento_remolques").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("registros_mantenimiento").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("registros_kilometraje").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("recordatorios").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("audit_logs").delete().neq("id", -1),
            supabaseAdmin.from("embarques").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("contactos_clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("representantes_clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("remolques").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("camiones").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            supabaseAdmin.from("operadores").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        ];

        const results = await Promise.allSettled(deletes);
        const errors = results
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => r.status === "rejected" || (r as any).value?.error)
            .map(({ r, i }) => ({ step: i, error: (r as any).reason || (r as any).value.error }));

        if (errors.length > 0) return res.status(500).json({ ok: false, errors });
        return res.status(200).json({ ok: true });
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || "Cleanup failed" });
    }
}

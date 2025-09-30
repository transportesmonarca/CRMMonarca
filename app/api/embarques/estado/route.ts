import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Update embarque estado
// POST /api/embarques/estado
// Body: { id: string, estado: string, fuente?: string }
export async function POST(request: Request) {
	try {
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
		const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!url) {
			return NextResponse.json(
				{ ok: false, error: { message: "SUPABASE_URL no configurado" } },
				{ status: 500 }
			);
		}

		// Prefer service role for server-side updates; fallback to anon if not set
		const supabase = createClient(url, serviceRoleKey || anonKey || "", {
			auth: { autoRefreshToken: false, persistSession: false }
		});

		let body: any;
		try {
			body = await request.json();
		} catch (e) {
			return NextResponse.json(
				{ ok: false, error: { message: "JSON inválido en la solicitud" } },
				{ status: 400 }
			);
		}

		const { id, estado, fuente } = body || {};
		if (!id || typeof id !== "string") {
			return NextResponse.json(
				{ ok: false, error: { message: "Falta 'id' de embarque" } },
				{ status: 400 }
			);
		}
		if (!estado || typeof estado !== "string") {
			return NextResponse.json(
				{ ok: false, error: { message: "Falta 'estado'" } },
				{ status: 400 }
			);
		}

		const nowIso = new Date().toISOString();
		const updatePayload: Record<string, any> = {
			estado,
			updated_at: nowIso,
		};
		
		// Agregar fecha específica según el estado para persistencia completa
		if (estado === 'listo-para-asignar') {
			updatePayload.fecha_completado = nowIso;
		} else if (estado === 'cancelado') {
			updatePayload.fecha_cancelacion = nowIso;
		} else if (estado === 'finalizado') {
			updatePayload.fecha_finalizacion = nowIso;
		} else if (estado === 'archivado') {
			updatePayload.fecha_archivado = nowIso;
		}

		// ✅ SOLO USAR TABLA EMBARQUES LEGACY (sin lógica dual)
		const { error } = await supabase
			.from('embarques')
			.update(updatePayload)
			.eq("id", id);

		if (error) {
			return NextResponse.json(
				{ ok: false, error: { message: error.message, code: error.code } },
				{ status: 400 }
			);
		}

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		// Last resort error handler
		const message = err?.message || "Error interno actualizando estado";
		return NextResponse.json(
			{ ok: false, error: { message } },
			{ status: 500 }
		);
	}
}


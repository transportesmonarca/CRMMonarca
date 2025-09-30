import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const CLAVE = "flete_falso_precio_global";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("configuracion_sistema")
      .select("valor")
      .eq("clave", CLAVE)
      .eq("activo", true)
      .single();

    if (error) {
      // Si la tabla no existe aún, devolvemos default
      return NextResponse.json({ precio: 800.0, source: "default" }, { status: 200 });
    }

    const precio = Number(data?.valor);
    return NextResponse.json({ precio: isNaN(precio) ? 800.0 : precio, source: "db" }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ precio: 800.0, source: "error" }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { precio, usuario } = body || {};

    const monto = Number(precio);
    if (!monto || isNaN(monto) || monto <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Upsert por clave
    const { error } = await supabase
      .from("configuracion_sistema")
      .upsert(
        {
          clave: CLAVE,
          valor: monto.toFixed(2),
          descripcion: "Precio único global para flete en falso (contingencias)",
          tipo_dato: "numero",
          categoria: "pagos_operadores",
          usuario_modificacion: usuario || "sistema",
          activo: true,
        },
        { onConflict: "clave" }
      );

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ 
        error: error.message || "No se pudo actualizar",
        details: error,
        table: "configuracion_sistema",
        action: "upsert"
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("Unexpected error:", e);
    return NextResponse.json({ 
      error: e?.message || "Error inesperado",
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 });
  }
}

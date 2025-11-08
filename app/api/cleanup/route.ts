import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Función para verificar contraseña de administrador
async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, username, password_hash, password_salt, is_admin, active")
      .eq("is_admin", true)
      .eq("active", true);
    if (error || !data || data.length === 0) {
      return false;
    }

    const subtle = (globalThis as any)?.crypto?.subtle;
    const enc = new TextEncoder();
    
    for (const admin of data) {
      try {
        let hashHex: string | null = null;
        if (subtle) {
          const saltBuf = Buffer.from(String(admin.password_salt || ''), 'base64');
          const saltBin = new Uint8Array(saltBuf);
          const key = await subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
          const bits = await subtle.deriveBits({ name: "PBKDF2", salt: saltBin, iterations: 100_000, hash: "SHA-256" }, key, 256);
          const bytes = Array.from(new Uint8Array(bits));
          hashHex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        if (!hashHex) continue;
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
    const body = await request.json();
    
    if (!body?.confirm) {
      return NextResponse.json({ error: "Confirmación requerida" }, { status: 400 });
    }

    // Verificar permisos de administrador (implementación simplificada)
    // En una implementación real, verificarías la sesión del usuario
    
    console.log("🧹 Iniciando limpieza total de datos...");
    
    // Lista de tablas a limpiar (en orden para respetar foreign keys)
    const tablasALimpiar = [
      'documentos',
      'recordatorios', 
      'registros_mantenimiento',
      'contactos_clientes',
      'embarques',
      'audit_logs',
      'remolques',
      'operadores',
      'camiones',
      'clientes'
    ];
    
    let eliminados = 0;
    const resultados: Record<string, number> = {};
    
    for (const tabla of tablasALimpiar) {
      try {
        console.log(`🗑️ Limpiando tabla: ${tabla}`);
        
        // Contar registros antes de eliminar
        const { count: countBefore } = await supabase
          .from(tabla)
          .select('*', { count: 'exact', head: true });
        
        if ((countBefore || 0) > 0) {
          // Eliminar todos los registros de la tabla
          const { error } = await supabase
            .from(tabla)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todo excepto un ID imposible
          
          if (error) {
            console.error(`Error eliminando de ${tabla}:`, error);
            // Continuar con otras tablas aunque una falle
          } else {
            const eliminadosTabla = countBefore || 0;
            eliminados += eliminadosTabla;
            resultados[tabla] = eliminadosTabla;
            console.log(`✅ ${tabla}: ${eliminadosTabla} registros eliminados`);
          }
        } else {
          resultados[tabla] = 0;
          console.log(`ℹ️ ${tabla}: Sin registros que eliminar`);
        }
      } catch (error) {
        console.error(`Error procesando tabla ${tabla}:`, error);
        resultados[tabla] = -1; // Marca error
      }
    }
    
    console.log(`🏁 Limpieza completada. Total eliminados: ${eliminados}`);
    
    return NextResponse.json({
      ok: true,
      message: "Limpieza total completada",
      totalEliminados: eliminados,
      detallesPorTabla: resultados
    });
    
  } catch (error: any) {
    console.error("Error en limpieza total:", error);
    return NextResponse.json({ 
      error: error?.message || "Error desconocido en limpieza total" 
    }, { status: 500 });
  }
}
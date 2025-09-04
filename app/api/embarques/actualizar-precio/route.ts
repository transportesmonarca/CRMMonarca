import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  const parts = header.split(';').map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return decodeURIComponent(p.split('=').slice(1).join('='));
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { embarque_id, precio, usuario: usuarioBody, razon } = body || {};

    // razon is required. usuario is optional because we can derive it from an auth token.
    if (!embarque_id || precio == null || !razon) {
      return NextResponse.json({ error: 'Parámetros incompletos: embarque_id, precio y razon son requeridos' }, { status: 400 });
    }

    // Try to verify the request's user from a Supabase access token when available.
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let token: string | null = null;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (authHeader) {
      token = authHeader.trim();
    } else {
      // check cookies for common Supabase cookie names
      const cookieHeader = req.headers.get('cookie');
      token = parseCookie(cookieHeader, 'sb-access-token') || parseCookie(cookieHeader, 'sb:token') || null;
    }

    const supabaseAdmin = getSupabaseAdmin();

    let usuarioEnviar = usuarioBody || 'app.user';
    if (token) {
      try {
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (!userErr && userData && userData.user) {
          // pick a human-friendly name if available
          usuarioEnviar = (userData.user.user_metadata && (userData.user.user_metadata.nombre || userData.user.user_metadata.name)) || userData.user.email || userData.user.id;
        }
      } catch (uErr) {
        // ignore and fall back to provided usuario
        console.warn('Could not verify auth token for actualizar-precio:', uErr);
      }
    }

    // Call the RPC using the admin client so the RPC can run atomically and with required permissions
    const { data, error } = await supabaseAdmin.rpc('actualizar_precio_embarque', {
      p_embarque_id: embarque_id,
      p_precio: precio,
      p_usuario: usuarioEnviar,
      p_razon: razon,
    });

    if (error) {
      console.error('Error RPC actualizar_precio_embarque:', error);
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('Exception in actualizar-precio route:', e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

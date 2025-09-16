import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token
  try {
    const supabase = getSupabaseAdmin()
    const { data: link } = await supabase.from('public_links').select('*').eq('token', token).single()
    if (!link) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 })

    const embarqueId = link.embarque_id
  const { data: embarque } = await supabase.from('embarques').select(`*, cliente:clientes(nombre), operador:operadores(nombre,apellidos), camion:camiones(numero_economico,placas,marca), remolque:remolques(numero_economico,placas,marca)`).eq('id', embarqueId).single()
  const { data: fotos } = await supabase.from('fotos_embarques').select('*').eq('embarque_id', embarqueId)

  // Obtener puntos (recolectas/entregas) asociados al embarque para exponerlos en la vista pública
  const { data: puntos } = await supabase.from('embarque_puntos').select('*').eq('embarque_id', embarqueId).order('orden', { ascending: true })

  // Convertir puntos a estructuras separadas por tipo para facilidad en el frontend
  const recolectas = (puntos || []).filter((p: any) => p.tipo === 'recolecta').map((p: any) => ({ direccion: p.direccion, fecha: p.fecha, hora: p.hora, orden: p.orden }))
  const entregas = (puntos || []).filter((p: any) => p.tipo === 'entrega').map((p: any) => ({ direccion: p.direccion, fecha: p.fecha, hora: p.hora, orden: p.orden }))

  return NextResponse.json({ embarque, fotos, recolectas, entregas })
  } catch (e: any) {
    console.error('GET /api/public-link/[token] error', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  // Save a comment for this public link
  const token = params.token
  try {
    const body = await req.json()
    const { name = 'Cliente', message = '' } = body || {}
    const supabase = getSupabaseAdmin()
    const { data: link } = await supabase.from('public_links').select('*').eq('token', token).single()
    if (!link) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 })

    const { error } = await supabase.from('public_comments').insert([{ public_link_token: token, embarque_id: link.embarque_id, name, message }])
    if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('POST /api/public-link/[token] error', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

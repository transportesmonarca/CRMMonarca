import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { embarqueId, hours = 72, expiresAt: expiresAtInput } = body || {}
    
    console.log('🔗 POST /api/public-link - Request body:', { embarqueId, hours, expiresAtInput })
    
    if (!embarqueId) return NextResponse.json({ error: 'embarqueId is required' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // ✅ NUEVA LÓGICA: Verificar si ya existe una liga para este embarque
    console.log('🔗 Buscando liga existente para embarque:', embarqueId)
    
    const { data: existingLink, error: checkError } = await supabase
      .from('public_links')
      .select('*')
      .eq('embarque_id', embarqueId)
      .eq('activo', true)
      .single()
    
    console.log('🔗 Resultado búsqueda:', { existingLink, checkError })

    // Si ya existe una liga activa, retornarla en lugar de crear una nueva
    if (existingLink && !checkError) {
      console.log(`✅ Liga existente encontrada para embarque ${embarqueId}`)
      const response = { 
        token: existingLink.token, 
        url: `/embarque-public/${embarqueId}?token=${existingLink.token}`, 
        expiresAt: existingLink.expires_at,
        existing: true
      }
      console.log('✅ Retornando liga existente:', response)
      return NextResponse.json(response)
    }
    
    // Si hay error verificando (por ejemplo, columna activo no existe), intentar sin el filtro
    if (checkError && checkError.message?.includes('column')) {
      console.log('⚠️ Error con columna activo, buscando sin filtro:', checkError.message)
      const { data: fallbackLink, error: fallbackError } = await supabase
        .from('public_links')
        .select('*')
        .eq('embarque_id', embarqueId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (fallbackLink && !fallbackError) {
        console.log(`✅ Liga existente encontrada (fallback) para embarque ${embarqueId}`)
        const response = {
          token: fallbackLink.token,
          url: `/embarque-public/${embarqueId}?token=${fallbackLink.token}`,
          expiresAt: fallbackLink.expires_at,
          existing: true
        }
        console.log('✅ Retornando liga existente (fallback):', response)
        return NextResponse.json(response)
      }
    }

    // Si no existe, crear una nueva liga única
    // Determine expiration: prefer explicit expiresAt if provided, otherwise compute from hours
    let computedExpiresAt: string
    if (expiresAtInput) {
      const parsed = new Date(expiresAtInput)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'invalid_expiresAt' }, { status: 400 })
      }
      // Ensure expiresAt is in the future
      if (parsed.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'expiresAt_must_be_future' }, { status: 400 })
      }
      computedExpiresAt = parsed.toISOString()
    } else {
      // Por defecto, la liga expira en 30 días
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + 30)
      computedExpiresAt = expirationDate.toISOString()
    }

    const token = uuidv4()
    
    console.log('🔗 Generando nuevo token:', token)
    console.log('🔗 Expiración calculada:', computedExpiresAt)

    // Desactivar cualquier liga anterior del embarque (si la columna activo existe)
    try {
      await supabase
        .from('public_links')
        .update({ activo: false })
        .eq('embarque_id', embarqueId)
      console.log('✅ Ligas anteriores desactivadas')
    } catch (updateError) {
      console.log('⚠️ No se pudieron desactivar ligas anteriores (probablemente columna activo no existe):', updateError)
    }

    // Insert into public_links table - intentar con columna activo primero
    console.log('🔗 Insertando nueva liga en base de datos...')
    let insertData: any = { 
      token, 
      embarque_id: embarqueId, 
      expires_at: computedExpiresAt
    }
    
    // Intentar con activo: true primero
    insertData.activo = true
    let { error } = await supabase
      .from('public_links')
      .insert([insertData])
    
    // Si falla por la columna activo, intentar sin ella
    if (error && error.message?.includes('column')) {
      console.log('⚠️ Columna activo no existe, insertando sin ella')
      delete insertData.activo
      const result = await supabase
        .from('public_links')
        .insert([insertData])
      error = result.error
    }
      
    if (error) {
      console.error('❌ Error insertando public_links:', error)
      return NextResponse.json({ error: 'database_error', detail: error.message }, { status: 500 })
    }

    console.log('✅ Liga creada exitosamente')
    const response = { token, url: `/embarque-public/${embarqueId}?token=${token}`, expiresAt: computedExpiresAt }
    console.log('✅ Retornando respuesta:', response)
    return NextResponse.json(response)
  } catch (e: any) {
    console.error('POST /api/public-link error', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

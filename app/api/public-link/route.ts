import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { embarqueId, hours = 72 } = body || {}
    if (!embarqueId) return NextResponse.json({ error: 'embarqueId is required' }, { status: 400 })

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + Number(hours) * 3600_000).toISOString()

    const supabase = getSupabaseAdmin()
    // Insert into public_links table (create migration if missing)
    const { error } = await supabase.from('public_links').insert([{ token, embarque_id: embarqueId, expires_at: expiresAt }])
    if (error) {
      console.error('Error inserting public_links:', error)
      return NextResponse.json({ error: 'database_error', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ token, url: `/embarque-public/${embarqueId}?token=${token}`, expiresAt })
  } catch (e: any) {
    console.error('POST /api/public-link error', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

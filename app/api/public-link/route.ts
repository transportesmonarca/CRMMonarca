import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { embarqueId, hours = 72, expiresAt: expiresAtInput } = body || {}
    if (!embarqueId) return NextResponse.json({ error: 'embarqueId is required' }, { status: 400 })

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
      computedExpiresAt = new Date(Date.now() + Number(hours) * 3600_000).toISOString()
    }

    const token = uuidv4()

    const supabase = getSupabaseAdmin()
    // Insert into public_links table (create migration if missing)
    const { error } = await supabase.from('public_links').insert([{ token, embarque_id: embarqueId, expires_at: computedExpiresAt }])
    if (error) {
      console.error('Error inserting public_links:', error)
      return NextResponse.json({ error: 'database_error', detail: error.message }, { status: 500 })
    }

  return NextResponse.json({ token, url: `/embarque-public/${embarqueId}?token=${token}`, expiresAt: computedExpiresAt })
  } catch (e: any) {
    console.error('POST /api/public-link error', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

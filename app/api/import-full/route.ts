import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const dryRun = body.dryRun === true
    const payload = body.data || body // accept { data: {...} } or raw

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Only perform a dry-run summary to avoid accidental writes
    const summary: Record<string, { count: number; sample: any[] }> = {}
    for (const key of Object.keys(payload)) {
      const arr = Array.isArray(payload[key]) ? payload[key] : (payload[key]?.data || [])
      summary[key] = { count: arr.length, sample: arr.slice(0, 5) }
    }

    if (dryRun) {
      return NextResponse.json({ dryRun: true, summary })
    }

    // If not dryRun, refuse by default to prevent accidental imports.
    return NextResponse.json({ error: 'Actual import is disabled. Use dryRun=true to preview.' }, { status: 403 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Import failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import zlib from 'zlib'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // List of tables to export - adjust as needed
    const tables = ['embarques', 'clientes', 'operadores', 'camiones', 'remolques', 'audit_logs']
    const exportData: Record<string, any> = {}

    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*')
      if (error) {
        exportData[t] = { error: error.message }
      } else {
        exportData[t] = data || []
      }
    }

    const json = JSON.stringify({ exported_at: new Date().toISOString(), data: exportData })
    const gz = zlib.gzipSync(Buffer.from(json))

  const headers = new Headers()
  headers.set('Content-Type', 'application/gzip')
  headers.set('Content-Disposition', `attachment; filename="monarca-export-${new Date().toISOString().slice(0,10)}.json.gz"`)
  return new Response(gz.buffer as any, { headers })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Export failed' }, { status: 500 })
  }
}

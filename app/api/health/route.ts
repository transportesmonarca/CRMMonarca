import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verificar que las variables de entorno estén configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Missing environment variables',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Health check básico
    return NextResponse.json({
      status: 'ok',
      message: 'Monarca CRM is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
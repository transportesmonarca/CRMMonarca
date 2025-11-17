import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix')

    if (!prefix) {
      return NextResponse.json({ error: 'Prefix parameter is required' }, { status: 400 })
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN

    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN no está configurado')
      return NextResponse.json({ error: 'Token de blob no configurado' }, { status: 500 })
    }

    console.log('Listando blobs con prefix:', prefix)

    const { blobs } = await list({
      prefix,
      token,
    })

    console.log(`Encontrados ${blobs.length} archivos`)

    return NextResponse.json({
      success: true,
      blobs,
      count: blobs.length
    })

  } catch (error) {
    console.error('Error listando blobs:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    )
  }
}